"""Docker 客户端管理器

统一管理本地和远程 Docker 客户端，提供容器运行、状态查询、日志获取等功能。

核心职责：
1. 客户端连接管理（本地 Unix socket / 远程 SSH）
2. API 版本自动协商（兼容 Docker 19.03+）
3. 容器生命周期管理（运行、查询、停止、删除）
4. 错误处理和重试机制

使用方式：
    manager = DockerClientManager()
    success, container_id = manager.run_container(
        worker=worker_node,
        image='xingrin/worker:latest',
        command=['python', '-m', 'scan'],
        environment={'SERVER_URL': 'http://...'},
        volumes={'/opt/xingrin': {'bind': '/opt/xingrin', 'mode': 'rw'}},
    )
"""

import logging
from typing import Optional, Dict, Any, Generator
from contextlib import contextmanager

import docker
from docker.errors import DockerException, ImageNotFound, APIError, NotFound
from django.conf import settings

from apps.engine.models import WorkerNode

logger = logging.getLogger(__name__)


class DockerClientManager:
    """Docker 客户端管理器
    
    单例模式，缓存 Worker 的 Docker 客户端连接。
    """
    
    # 客户端连接缓存（Worker ID -> DockerClient）
    _clients: Dict[int, docker.DockerClient] = {}
    
    # Docker API 版本（兼容 Docker 19.03+）
    DOCKER_API_VERSION = '1.40'
    
    @classmethod
    def get_client(cls, worker: WorkerNode) -> docker.DockerClient:
        """获取 Worker 的 Docker 客户端
        
        本地 Worker：连接本地 Unix socket
        远程 Worker：暂不支持（待实现 Docker Context 或 SSH 隧道）
        
        Args:
            worker: Worker 节点
            
        Returns:
            Docker 客户端实例
            
        Raises:
            DockerException: Docker 连接失败
        """
        # 检查缓存
        if worker.id in cls._clients:
            try:
                # 验证连接是否有效
                client = cls._clients[worker.id]
                client.ping()
                return client
            except DockerException:
                # 连接失效，移除缓存
                logger.warning(f"Worker {worker.name} 的 Docker 连接失效，重新建立")
                cls._clients.pop(worker.id, None)
        
        # 创建新连接
        if worker.is_local:
            client = cls._create_local_client()
        else:
            client = cls._create_remote_client(worker)
        
        # 缓存连接
        cls._clients[worker.id] = client
        logger.info(f"已建立 Docker 连接 - Worker: {worker.name}, API: {cls.DOCKER_API_VERSION}")
        
        return client
    
    @classmethod
    def _create_local_client(cls) -> docker.DockerClient:
        """创建本地 Docker 客户端"""
        try:
            client = docker.DockerClient(
                base_url='unix://var/run/docker.sock',
                version=cls.DOCKER_API_VERSION,
            )
            # 测试连接
            client.ping()
            logger.info("本地 Docker 客户端创建成功")
            return client
        except DockerException as e:
            logger.error(f"本地 Docker 连接失败: {e}")
            raise
    
    @classmethod
    def _create_remote_client(cls, worker: WorkerNode) -> docker.DockerClient:
        """创建远程 Docker 客户端
        
        TODO: 实现远程连接
        - 方案 A：Docker Context（推荐）
        - 方案 B：SSH 隧道 + TCP 连接
        
        当前降级方案：抛出异常，保留 SSH + CLI 方式
        """
        raise NotImplementedError(
            f"远程 Worker {worker.name} 暂不支持 SDK 方式，"
            "请等待 Docker Context 实现或使用 SSH + CLI 降级方案"
        )
    
    @classmethod
    def run_container(
        cls,
        worker: WorkerNode,
        image: str,
        command: Optional[list] = None,
        environment: Optional[Dict[str, str]] = None,
        volumes: Optional[Dict[str, Dict[str, str]]] = None,
        network: Optional[str] = None,
        detach: bool = True,
        remove: bool = True,
        **kwargs
    ) -> tuple[bool, str]:
        """在 Worker 上运行容器
        
        Args:
            worker: Worker 节点
            image: 镜像名称（如 'xingrin/worker:latest'）
            command: 容器启动命令（如 ['python', '-m', 'scan']）
            environment: 环境变量字典
            volumes: 挂载卷配置 {host_path: {'bind': container_path, 'mode': 'rw'}}
            network: 网络名称
            detach: 是否后台运行
            remove: 退出后是否自动删除
            **kwargs: 其他 docker.containers.run() 参数
            
        Returns:
            (success, container_id_or_error) 元组
            - success=True: container_id 为容器 ID
            - success=False: container_id_or_error 为错误信息
        """
        try:
            client = cls.get_client(worker)
            
            # 构建容器配置
            container_config = {
                'image': image,
                'command': command,
                'environment': environment or {},
                'volumes': volumes or {},
                'detach': detach,
                'remove': remove,
                **kwargs
            }
            
            # 本地 Worker 需要指定网络
            if worker.is_local and network:
                container_config['network'] = network
            
            logger.info(
                f"启动容器 - Worker: {worker.name}, Image: {image}, "
                f"Command: {' '.join(command) if command else 'default'}"
            )
            
            # 运行容器
            container = client.containers.run(**container_config)
            
            # 如果是 detach 模式，返回容器 ID
            if detach:
                container_id = container.id
                logger.info(
                    f"容器已启动 - Worker: {worker.name}, "
                    f"Container ID: {container_id[:12]}"
                )
                return True, container_id
            else:
                # 非 detach 模式，返回容器输出
                output = container.logs().decode()
                return True, output
                
        except ImageNotFound as e:
            error_msg = f"镜像不存在: {image}"
            logger.error(f"{error_msg} - Worker: {worker.name}")
            return False, error_msg
        except APIError as e:
            error_msg = f"Docker API 错误 (status={e.status_code}): {e.explanation}"
            logger.error(f"{error_msg} - Worker: {worker.name}")
            return False, error_msg
        except DockerException as e:
            error_msg = f"Docker 异常: {str(e)}"
            logger.error(f"{error_msg} - Worker: {worker.name}")
            return False, error_msg
        except Exception as e:
            error_msg = f"未知错误: {str(e)}"
            logger.error(f"{error_msg} - Worker: {worker.name}", exc_info=True)
            return False, error_msg
    
    @classmethod
    def get_container(cls, worker: WorkerNode, container_id: str) -> Optional[docker.models.containers.Container]:
        """获取容器对象
        
        Args:
            worker: Worker 节点
            container_id: 容器 ID
            
        Returns:
            容器对象，不存在返回 None
        """
        try:
            client = cls.get_client(worker)
            return client.containers.get(container_id)
        except NotFound:
            logger.warning(f"容器不存在 - Worker: {worker.name}, ID: {container_id[:12]}")
            return None
        except DockerException as e:
            logger.error(f"获取容器失败 - Worker: {worker.name}, ID: {container_id[:12]}, Error: {e}")
            return None
    
    @classmethod
    def get_container_status(cls, worker: WorkerNode, container_id: str) -> Optional[Dict[str, Any]]:
        """获取容器状态
        
        Args:
            worker: Worker 节点
            container_id: 容器 ID
            
        Returns:
            状态字典，包含 status, exit_code 等信息，容器不存在返回 None
        """
        container = cls.get_container(worker, container_id)
        if not container:
            return None
        
        try:
            container.reload()  # 刷新状态
            state = container.attrs['State']
            
            return {
                'status': state['Status'],  # running, exited, dead, etc.
                'running': state['Running'],
                'exit_code': state.get('ExitCode'),
                'error': state.get('Error', ''),
                'started_at': state.get('StartedAt'),
                'finished_at': state.get('FinishedAt'),
            }
        except Exception as e:
            logger.error(f"获取容器状态失败 - Worker: {worker.name}, ID: {container_id[:12]}, Error: {e}")
            return None
    
    @classmethod
    def get_container_logs(
        cls,
        worker: WorkerNode,
        container_id: str,
        tail: int = 100,
        follow: bool = False
    ) -> Optional[str | Generator[str, None, None]]:
        """获取容器日志
        
        Args:
            worker: Worker 节点
            container_id: 容器 ID
            tail: 返回最后 N 行，0 表示全部
            follow: 是否实时跟随（流式）
            
        Returns:
            - follow=False: 返回日志字符串
            - follow=True: 返回日志生成器（逐行）
            - 失败返回 None
        """
        container = cls.get_container(worker, container_id)
        if not container:
            return None
        
        try:
            if follow:
                # 流式日志（生成器）
                def log_generator():
                    for line in container.logs(stream=True, follow=True, tail=tail):
                        yield line.decode('utf-8', errors='replace')
                return log_generator()
            else:
                # 一次性日志
                logs = container.logs(tail=tail)
                return logs.decode('utf-8', errors='replace')
        except Exception as e:
            logger.error(f"获取容器日志失败 - Worker: {worker.name}, ID: {container_id[:12]}, Error: {e}")
            return None
    
    @classmethod
    def stop_container(cls, worker: WorkerNode, container_id: str, timeout: int = 10) -> bool:
        """停止容器
        
        Args:
            worker: Worker 节点
            container_id: 容器 ID
            timeout: 超时时间（秒）
            
        Returns:
            是否成功
        """
        container = cls.get_container(worker, container_id)
        if not container:
            return False
        
        try:
            container.stop(timeout=timeout)
            logger.info(f"容器已停止 - Worker: {worker.name}, ID: {container_id[:12]}")
            return True
        except Exception as e:
            logger.error(f"停止容器失败 - Worker: {worker.name}, ID: {container_id[:12]}, Error: {e}")
            return False
    
    @classmethod
    def remove_container(cls, worker: WorkerNode, container_id: str, force: bool = False) -> bool:
        """删除容器
        
        Args:
            worker: Worker 节点
            container_id: 容器 ID
            force: 是否强制删除（即使容器正在运行）
            
        Returns:
            是否成功
        """
        container = cls.get_container(worker, container_id)
        if not container:
            return False
        
        try:
            container.remove(force=force)
            logger.info(f"容器已删除 - Worker: {worker.name}, ID: {container_id[:12]}")
            return True
        except Exception as e:
            logger.error(f"删除容器失败 - Worker: {worker.name}, ID: {container_id[:12]}, Error: {e}")
            return False
    
    @classmethod
    def cleanup(cls):
        """清理所有客户端连接"""
        for client in cls._clients.values():
            try:
                client.close()
            except Exception as e:
                logger.warning(f"关闭 Docker 客户端失败: {e}")
        
        cls._clients.clear()
        logger.info("Docker 客户端连接已全部关闭")

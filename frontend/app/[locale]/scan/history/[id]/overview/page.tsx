"use client"

import { useParams } from "next/navigation"
import { ScanOverview } from "@/components/scan/history/scan-overview"

/**
 * Scan overview page
 * Displays scan statistics and summary information
 */
export default function ScanOverviewPage() {
  const { id } = useParams<{ id: string }>()
  const scanId = Number(id)

  return (
    <div className="px-4 lg:px-6">
      <ScanOverview scanId={scanId} />
    </div>
  )
}

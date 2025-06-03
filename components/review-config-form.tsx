"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ReviewConfigFormProps {
  onSubmit: (values: {
    documentType: string
    governingLaw: string
    party: string
  }) => void
}

export function ReviewConfigForm({ onSubmit }: ReviewConfigFormProps) {
  const [documentType, setDocumentType] = React.useState("Non-Disclosure Agreement")
  const [governingLaw, setGoverningLaw] = React.useState("England and Wales")
  const [party, setParty] = React.useState("")

  const isComplete = documentType && governingLaw && party

  return (
    <div className="w-full space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Document type:</label>
        <Select value={documentType} onValueChange={setDocumentType}>
          <SelectTrigger className="border-2 border-[#F2E7FE] focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Non-Disclosure Agreement">Non-Disclosure Agreement</SelectItem>
            <SelectItem value="Service Agreement">Service Agreement</SelectItem>
            <SelectItem value="Employment Contract">Employment Contract</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Governing law:</label>
        <Select value={governingLaw} onValueChange={setGoverningLaw}>
          <SelectTrigger className="border-2 border-[#F2E7FE] focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="England and Wales">England and Wales</SelectItem>
            <SelectItem value="Scotland">Scotland</SelectItem>
            <SelectItem value="Northern Ireland">Northern Ireland</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Party you represent:</label>
        <Select value={party} onValueChange={setParty}>
          <SelectTrigger className="border-2 border-[#F2E7FE] focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent">
            <SelectValue placeholder="Type your own or select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="The Disclosing Party">The Disclosing Party</SelectItem>
            <SelectItem value="The Receiving Party">The Receiving Party</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
        onClick={() => onSubmit({ documentType, governingLaw, party })}
        disabled={!isComplete}
      >
        Confirm
      </Button>
    </div>
  )
}

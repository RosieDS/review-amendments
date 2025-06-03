"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Check } from "lucide-react"

interface CopyIconProps {
  content: string
  align: "left" | "right"
}

export function CopyIcon({ content, align }: CopyIconProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      className={`absolute top-1 ${align === "left" ? "left-1" : "right-1"} cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleCopy}
    >
      {copied ? (
        <div className="bg-green-100 rounded-full p-0.5">
          <Check className="h-3.5 w-3.5 text-green-600" />
        </div>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M8 5H6C4.89543 5 4 5.89543 4 7V19C4 20.1046 4.89543 21 6 21H16C17.1046 21 18 20.1046 18 19V17"
            stroke="#6B7280"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18 13V9C18 7.89543 17.1046 7 16 7H12C10.8954 7 10 7.89543 10 9V17C10 18.1046 10.8954 19 12 19H16C17.1046 19 18 18.1046 18 17"
            stroke="#6B7280"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </motion.div>
  )
}

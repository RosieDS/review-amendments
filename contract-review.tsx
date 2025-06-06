"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  CheckCircle2,
  Send,
  GitCompare,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  X,
  Plus,
  FileSearch,
} from "lucide-react"
import { ReviewConfigForm } from "./components/review-config-form"
import { motion, AnimatePresence } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronUp } from "lucide-react"

interface Message {
  id: string
  type: "ai" | "user"
  content: string
  isLoading?: boolean
}

interface ChatThread {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  resolvedAt?: Date
  fromHistory?: boolean
}

interface ChildItem {
  title: string
  description: string
  severity: "High" | "Medium"
  resolved?: boolean
  scrollToSection?: string
}

export default function ContractReview() {
  const [prompt, setPrompt] = useState("")
  const [activeChat, setActiveChat] = useState<ChatThread | null>({
    id: Date.now().toString(),
    title: "New chat",
    messages: [],
    createdAt: new Date(),
  })
  const [resolvedChats, setResolvedChats] = useState<ChatThread[]>([])
  const [addedChatIds, setAddedChatIds] = useState<Set<string>>(new Set())
  const [selectedChildItem, setSelectedChildItem] = useState<ChildItem | null>(null)
  const [childItemMessages, setChildItemMessages] = useState<Record<string, Message[]>>({})
  const [childItemPrompt, setChildItemPrompt] = useState("")
  const [resolvedItems, setResolvedItems] = useState<string[]>([])
  const [currentTab, setCurrentTab] = useState<"todo" | "done">("done")
  const [riskPriority, setRiskPriority] = useState<"high" | "medium" | "all">("high")
  const [historyFilter, setHistoryFilter] = useState<"all" | "risks" | "chats">("all")
  const [scrollToClause, setScrollToClause] = useState(true)
  const [reviewRun, setReviewRun] = useState(false)
  const [showBottomPanel, setShowBottomPanel] = useState(false) // Start with bottom panel hidden
  const [isProcessingReview, setIsProcessingReview] = useState(false)
  const [leftPanelWidth, setLeftPanelWidth] = useState(30)
  const [isResizing, setIsResizing] = useState(false)
  const [showLeftPanel, setShowLeftPanel] = useState(false) // Start with left panel collapsed
  const [isFirstMessageSent, setIsFirstMessageSent] = useState(false)
  const [animateRiskItems, setAnimateRiskItems] = useState(false)
  const [animateChatHistory, setAnimateChatHistory] = useState(false)
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(false)
  const [autoApplySelection, setAutoApplySelection] = useState<"manual" | "direct" | "track_changes" | null>(null)
  const [directApplyEnabled, setDirectApplyEnabled] = useState(false)
  const [previewedFlags, setPreviewedFlags] = useState<string[]>([])
  const [acceptedFlags, setAcceptedFlags] = useState<string[]>([])
  const [purpleUnderlines, setPurpleUnderlines] = useState<Record<string, boolean>>({})

  // Edit navigation state
  const [currentEditIndex, setCurrentEditIndex] = useState<Record<string, number>>({})

  // Refs for document sections
  const section3Ref = useRef<HTMLDivElement>(null)
  const partiesRef = useRef<HTMLDivElement>(null)
  const backgroundRef = useRef<HTMLDivElement>(null)
  const agreedTermsRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<HTMLDivElement>(null)
  const returnDestructionRef = useRef<HTMLDivElement>(null)
  const remediesRef = useRef<HTMLDivElement>(null)
  const interpretationRef = useRef<HTMLDivElement>(null)

  // Ref for chat scroll area
  const chatEndRef = useRef<HTMLDivElement>(null)

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    document.addEventListener("mousemove", handleResize)
    document.addEventListener("mouseup", handleResizeEnd)
  }

  const handleResize = (e: MouseEvent) => {
    if (!isResizing) return

    // Calculate percentage based on mouse position
    const percentage = (e.clientX / window.innerWidth) * 100

    // Clamp between 30% and 45%
    const clampedPercentage = Math.min(Math.max(percentage, 30), 45)

    setLeftPanelWidth(clampedPercentage)
  }

  const handleResizeEnd = () => {
    setIsResizing(false)
    document.removeEventListener("mousemove", handleResize)
    document.removeEventListener("mouseup", handleResizeEnd)
  }

  // Cleanup resize listeners
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleResize)
      document.removeEventListener("mouseup", handleResizeEnd)
    }
  }, [isResizing])

  const toggleLeftPanel = () => {
    setShowLeftPanel((prev) => !prev)
  }

  // Auto-scroll chat to bottom when messages change
  useEffect(() => {
    if (activeChat && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [activeChat, activeChat?.messages])

  // Simulated AI function to generate chat title
  const generateChatTitle = async (message: string) => {
    // In a real implementation, this would call an AI API
    // For now, we'll just take the first few words
    const words = message.split(" ").slice(0, 4).join(" ")
    return `${words}...`
  }

  // Add a function to actually start the review after configuration
  const startReview = () => {
    setReviewRun(true)
    setShowBottomPanel(true)
    setRiskPriority("all")
    setCurrentTab("todo")
    setShowLeftPanel(true) // Show left panel when review is completed

    // Reset selection state for new review
    setAutoApplySelection(null)

    // Count high and medium risk items
    const highRiskCount = [...ipProtectionItems, ...enforceabilityItems].filter(
      (item) => item.severity === "High" && !resolvedItems.includes(item.title),
    ).length

    const mediumRiskCount = [...ipProtectionItems, ...enforceabilityItems].filter(
      (item) => item.severity === "Medium" && !resolvedItems.includes(item.title),
    ).length

    // Add a summary message to the active chat instead of closing it
    if (activeChat) {
      setActiveChat((prev) => {
        if (!prev) return null

        // Check if the completion message has already been added to prevent duplicates
        const completionMessageExists = prev.messages.some(msg => 
          msg.type === "ai" && msg.content.includes("We've completed your AI review")
        )

        if (completionMessageExists) {
          return prev // Return unchanged if completion message already exists
        }

        return {
          ...prev,
          messages: [
            ...prev.messages,
            {
              id: Date.now().toString(),
              type: "ai",
              content: `Thanks! We've completed your AI review.\n\nWe found ${highRiskCount} high risk ${highRiskCount === 1 ? "flag" : "flags"} and ${mediumRiskCount} medium risk ${mediumRiskCount === 1 ? "flag" : "flags"} in your document.\n\nYou can review them in the left panel.`,
            },
          ],
        }
      })

      // Add to history if not already there
      if (!addedChatIds.has(activeChat.id)) {
        addChatToHistory(activeChat)
      }
    }

    // Trigger the animation for risk items
    setAnimateRiskItems(true)

    // Reset animation flag after a delay
    setTimeout(() => {
      setAnimateRiskItems(false)
    }, 2000)
  }

  // Function to add a chat to history
  const addChatToHistory = (chat: ChatThread) => {
    // Only add if not already in history
    if (!addedChatIds.has(chat.id)) {
      setResolvedChats((prev) => [
        ...prev,
        {
          ...chat,
          resolvedAt: new Date(),
        },
      ])

      // Add the ID to our tracking set
      setAddedChatIds((prev) => new Set(prev).add(chat.id))

      // Trigger animation for chat history
      setAnimateChatHistory(true)

      // Reset animation flag after a longer delay to accommodate the slower animation
      setTimeout(() => {
        setAnimateChatHistory(false)
      }, 3500)
    }
  }

  // Modify the handleSendMessage function to check if we're in a review configuration chat
  const handleSendMessage = async () => {
    if (!prompt.trim()) return

    // Show the left panel only on the first message after page load
    if (!isFirstMessageSent) {
      setShowLeftPanel(true)
      setIsFirstMessageSent(true)
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: prompt,
    }

    // Add AI response
    const aiResponse: Message = {
      id: (Date.now() + 1).toString(),
      type: "ai",
      content: "I'll help you analyze that. Let me check the document...",
    }

    if (!activeChat) {
      // Check if the prompt contains the word "Review" (case insensitive)
      if (prompt.toLowerCase().includes("review")) {
        // Create a review configuration chat with the user's message included
        const newChat: ChatThread = {
          id: Date.now().toString(),
          title: reviewRun ? "Re-Run Review" : "Run AI Review",
          messages: [
            // Include the user's original message
            userMessage,
            // Add the "Great! Just a couple of questions" message with line breaks
            {
              id: (Date.now() + 1).toString(),
              type: "ai",
              content:
                "Great! Just a couple of questions to tailor your review.\n\nFirstly, confirm your document details.",
            },
          ],
          createdAt: new Date(),
        }
        setActiveChat(newChat)

        // Add to history immediately
        addChatToHistory(newChat)

        // Switch to the "done" tab to show history
        setCurrentTab("done")
      } else {
        // Create regular chat thread
        const chatTitle = await generateChatTitle(prompt)
        const newChat: ChatThread = {
          id: Date.now().toString(),
          title: chatTitle,
          messages: [userMessage, aiResponse],
          createdAt: new Date(),
        }
        setActiveChat(newChat)

        // Add to history immediately
        addChatToHistory(newChat)

        // Switch to the "done" tab to show history
        setCurrentTab("done")
      }
    } else {
      // Add to existing chat
      setActiveChat((prev) => {
        if (!prev) return null

        // If this is the first message in a chat titled "New chat", use the user's message as the title
        if (prev.title === "New chat" && prev.messages.length === 0) {
          // Truncate the message if it's too long (more than 30 characters)
          const newTitle = prompt.length > 30 ? prompt.substring(0, 30) + "..." : prompt

          const updatedChat = {
            ...prev,
            title: newTitle,
            messages: [...prev.messages, userMessage, aiResponse],
          }

          // If this is the first message in a new chat, add it to history
          if (prev.messages.length === 0 && !addedChatIds.has(prev.id)) {
            // Add to history
            addChatToHistory(updatedChat)

            // Switch to the "done" tab to show history
            setCurrentTab("done")
          }

          return updatedChat
        }

        // Check if this is a review configuration chat
        if (prev.title === "Run AI Review" || prev.title === "Re-Run Review") {
          // Add the user's message
          const updatedMessages = [...prev.messages, userMessage]

          // Check if this is a review configuration chat initiated by text or button
          const isTextInitiatedReview =
            prev.messages.length > 2 &&
            prev.messages[0].type === "user" &&
            prev.messages[0].content.toLowerCase().includes("review")

          // For text-initiated review, we need to offset our message count by 1
          const userMessageOffset = isTextInitiatedReview ? 1 : 0

          // Count user messages in the updated messages (excluding the initial review message if present)
          const userMessageCount = updatedMessages.filter((msg) => msg.type === "user").length - userMessageOffset

          // If this is the first user response to party representation question
          if (userMessageCount === 1) {
            // Add the second system message about providing more information
            const infoRequestMessage: Message = {
              id: (Date.now() + 3).toString(),
              type: "ai",
              content:
                "Please give Genie as much information as possible to help tailor your review.\n\nThe more you write, the better your review will be.\n\nFor example:\nBackground on your business and the other party\nAny key concerns or risks\nYour top priorities for handling this contract",
            }

            return {
              ...prev,
              messages: [...updatedMessages, infoRequestMessage],
            }
          }
          // If this is the second user message (responding to information request)
          else if (userMessageCount === 2) {
            // Add the auto-apply question instead of immediately proceeding to "Thank you!"
            const autoApplyQuestion: Message = {
              id: (Date.now() + 2).toString(),
              type: "ai",
              content: "auto-apply-question", // Special marker for the auto-apply question
            }

            return {
              ...prev,
              messages: [...updatedMessages, autoApplyQuestion],
            }
          }
          // If this is the third user message (responding to auto-apply question)
          else if (userMessageCount === 3) {
            // Add the final thank you message with loading animation
            const finalMessage: Message = {
              id: (Date.now() + 2).toString(),
              type: "ai",
              content:
                "Thank you!\n\nWe're running your tailored AI risk review now. This might take a couple of minutes.",
              isLoading: true,
            }

            // Set processing state to true
            setIsProcessingReview(true)

            // After 4 seconds, complete the review but don't close the chat
            setTimeout(() => {
              setIsProcessingReview(false)
              startReview()
            }, 4000)

            return {
              ...prev,
              messages: [...updatedMessages, finalMessage],
            }
          }

          return {
            ...prev,
            messages: updatedMessages,
          }
        }

        return {
          ...prev,
          messages: [...prev.messages, userMessage, aiResponse],
        }
      })
    }

    setPrompt("")
  }

  const handleCloseChat = () => {
    if (activeChat) {
      // No need to add to history again - we're now using the addedChatIds Set to track this
      setActiveChat(null)

      // Show the bottom panel and focus on the done tab
      setShowBottomPanel(true)
      setCurrentTab("done")
    }
  }

  const handleSendChildItemMessage = () => {
    if (!childItemPrompt.trim() || !selectedChildItem) return

    const title = selectedChildItem.title

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: childItemPrompt,
    }

    // Add AI response
    const aiResponse: Message = {
      id: (Date.now() + 1).toString(),
      type: "ai",
      content: `I'll help you with the "${title}" task. Let me analyze the document...`,
    }

    setChildItemMessages((prev) => ({
      ...prev,
      [title]: [...(prev[title] || []), userMessage, aiResponse],
    }))
    setChildItemPrompt("")
  }

  const openChildItemChat = (item: ChildItem) => {
    setSelectedChildItem(item)

    // Initialize edit navigation index
    setCurrentEditIndex(prev => ({ ...prev, [item.title]: 0 }))

    // Create initial messages if they don't exist yet
    if (!childItemMessages[item.title]) {
      if (item.title === "Loophole: Unverified Prior Knowledge Claim") {
        setChildItemMessages((prev) => ({
          ...prev,
          [item.title]: [
            {
              id: "initial-description",
              type: "ai",
              content: "structured-risk-content", // Special marker for structured content
            },
          ],
        }))
      } else {
        setChildItemMessages((prev) => ({
          ...prev,
          [item.title]: [
            {
              id: "initial-description",
              type: "ai",
              content: "structured-risk-content-placeholder", // Special marker for placeholder content
            },
          ],
        }))
      }
    }

    // Auto-scroll to the relevant section based on scrollToSection property
    if (item.scrollToSection) {
      setTimeout(() => {
        switch (item.scrollToSection) {
          case "section3":
            section3Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" })
            break
          case "background":
            backgroundRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
            break
          case "agreedTerms":
            agreedTermsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
            break
          case "term":
            termRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
            break
          case "returnDestruction":
            returnDestructionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
            break
          case "remedies":
            remediesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
            break
          default:
            break
        }
      }, 100) // Small delay to ensure the chat opens before scrolling
    }

    // Close the active chat if one is open
    if (activeChat) {
      setActiveChat(null)
    }
  }

  const closeChildItemChat = () => {
    setSelectedChildItem(null)
  }

  const markItemAsResolved = (title: string) => {
    if (!resolvedItems.includes(title)) {
      setResolvedItems((prev) => [...prev, title])
    }
    closeChildItemChat()
    // Switch to the todo tab so user can continue reviewing other items
    setCurrentTab("todo")
  }

  const openResolvedChat = (chat: ChatThread) => {
    // Set the chat as active and mark it as coming from resolved chats
    setActiveChat({
      ...chat,
      fromHistory: true,
    })
    // Close the bottom panel
    setShowBottomPanel(false)
  }

  // Update the getCurrentList function to handle the new filtering structure
  const getCurrentList = () => {
    const allItems = [...ipProtectionItems, ...enforceabilityItems]

    if (currentTab === "done") {
      const resolvedRiskItems = allItems.filter((item) => resolvedItems.includes(item.title))

      // Apply history filter if it's not set to "all"
      if (historyFilter === "risks") {
        return resolvedRiskItems
      } else if (historyFilter === "chats") {
        return [] // Return empty array as the chats are rendered separately
      }

      return resolvedRiskItems
    }

    // Filter by risk priority
    if (riskPriority === "all") {
      // For "all" filter, show unresolved items but sort by severity (High first, then Medium)
      return allItems
        .filter((item) => !resolvedItems.includes(item.title))
        .sort((a, b) => {
          // Sort by severity - High comes before Medium
          if (a.severity === "High" && b.severity === "Medium") return -1
          if (a.severity === "Medium" && b.severity === "High") return 1
          return 0
        })
    } else {
      // For specific priority filters, only show items of that priority
      return allItems.filter(
        (item) => !resolvedItems.includes(item.title) && item.severity.toLowerCase() === riskPriority,
      )
    }
  }

  const handleNextRisk = () => {
    if (!selectedChildItem) return

    // Get all unresolved items regardless of severity
    const allUnresolvedItems = [...ipProtectionItems, ...enforceabilityItems].filter(
      (item) => !resolvedItems.includes(item.title),
    )

    // Find the index of the current item
    const currentIndex = allUnresolvedItems.findIndex((item) => item.title === selectedChildItem.title)

    // If we found the item and it's not the last one, go to the next item
    if (currentIndex !== -1 && currentIndex < allUnresolvedItems.length - 1) {
      openChildItemChat(allUnresolvedItems[currentIndex + 1])
    } else if (allUnresolvedItems.length > 0) {
      // If it's the last item, loop back to the first item
      openChildItemChat(allUnresolvedItems[0])
    }
  }

  const handlePreviousRisk = () => {
    if (!selectedChildItem) return

    // Get all unresolved items regardless of severity
    const allUnresolvedItems = [...ipProtectionItems, ...enforceabilityItems].filter(
      (item) => !resolvedItems.includes(item.title),
    )

    // Find the index of the current item
    const currentIndex = allUnresolvedItems.findIndex((item) => item.title === selectedChildItem.title)

    // If we found the item and it's not the first one, go to the previous item
    if (currentIndex > 0) {
      openChildItemChat(allUnresolvedItems[currentIndex - 1])
    } else if (allUnresolvedItems.length > 0) {
      // If it's the first item, loop to the last item
      openChildItemChat(allUnresolvedItems[allUnresolvedItems.length - 1])
    }
  }

  // Modify the handleRunReview function to open a new chat instead of immediately running the review
  const handleRunReview = () => {
    // Create a new chat for configuring the review
    const newChat: ChatThread = {
      id: Date.now().toString(),
      title: reviewRun ? "Re-Run Review" : "Run AI Review",
      messages: [
        {
          id: "system-message-1",
          type: "ai",
          content:
            "Great! Just a couple of questions to tailor your review.\n\nFirstly, confirm your document details.",
        },
      ],
      createdAt: new Date(),
    }

    // If there's an active chat, save it to resolved chats
    if (activeChat && !activeChat.fromHistory && !addedChatIds.has(activeChat.id)) {
      addChatToHistory(activeChat)
    }

    // Set the new chat as active
    setActiveChat(newChat)

    // Close the bottom panel if it's open
    setShowBottomPanel(false)
  }

  // Update the "Mark all as Reviewed" button to also trigger the review completion
  // Add this function
  const completeReview = () => {
    setReviewRun(true)
    setShowBottomPanel(true)
    setRiskPriority("all")
    setCurrentTab("todo")

    // Close the active chat if it exists
    if (activeChat) {
      setActiveChat(null)
    }
  }

  // Effect to auto-scroll when the scrollToClause setting changes or when a child item is selected
  useEffect(() => {
    if (
      (scrollToClause || selectedChildItem?.title === "No limits on reverse engineering") &&
      selectedChildItem?.scrollToSection === "section3" &&
      section3Ref.current
    ) {
      section3Ref.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [scrollToClause, selectedChildItem])

  const ipProtectionItems: ChildItem[] = [
    {
      title: "Loophole: Unverified Prior Knowledge Claim",
      description:
        "This clause lacks an explicit prohibition on reverse engineering, decompiling, or disassembling disclosed materials. Without this restriction, the Receiving Party could legally analyze and replicate proprietary information, risking loss of competitive advantage.\n\nAdding a clear ban on reverse engineering would help protect proprietary assets.",
      severity: "High",
      scrollToSection: "section3",
    },
    {
      title: "Premature Exit: Unilateral Early Termination",
      description:
        "This NDA does not clearly define ownership of intellectual property, leaving room for disputes over rights to derivatives, improvements, or modifications based on disclosed information. Without clarification, the Receiving Party could claim ownership over developments inspired by Confidential Information. \n\nAdd a section to this agreement specifying ownership of IP.",
      severity: "High",
      scrollToSection: "term",
    },
    {
      title: "Untrackable Oral Disclosures",
      description: "Include definition and ownership terms for derivative works",
      severity: "High",
      scrollToSection: "background",
    },
  ]

  const enforceabilityItems: ChildItem[] = [
    {
      title: "Vague Deadline: Unclear Return Timeline",
      description: "Add specific language about irreparable harm and right to injunction",
      severity: "Medium",
      scrollToSection: "returnDestruction",
    },
    {
      title: "Jurisdiction Gap: No Legal Venue Set",
      description: "Specify exact duration of confidentiality obligations post-termination",
      severity: "Medium",
      scrollToSection: "remedies",
    },
    {
      title: "Incomplete Confidentiality Lifecycle Controls",
      description: "Add comprehensive lifecycle management across multiple contract sections",
      severity: "Medium",
      scrollToSection: "agreedTerms",
    },
  ]

  const allTasks = [...ipProtectionItems, ...enforceabilityItems]
  const totalTasks = allTasks.length
  const completedTasks = resolvedItems.length

  // Add effect to update body cursor during resize
  useEffect(() => {
    if (isResizing) {
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
    } else {
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
  }, [isResizing])

  // Animation variants
  const chatAnimationVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.15, ease: "easeIn" } },
  }

  const leftPanelAnimationVariants = {
    hidden: { x: -300, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
  }

  const riskItemAnimationVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: (i: number) => ({
      opacity: 1,
      scale: 1,
      transition: {
        delay: i * 0.1,
        duration: 0.3,
        ease: "easeOut",
      },
    }),
  }

  // Add this after the riskItemAnimationVariants
  const chatHistoryAnimationVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        delay: i * 0.3, // Increased delay between items (0.1 → 0.3)
        duration: 0.5, // Longer animation duration (0.3 → 0.5)
        ease: "easeOut",
      },
    }),
  }

  // Track Changes Components
  const TrackDeleted = ({ children, onClick }: { children: React.ReactNode, onClick?: () => void }) => (
    <span 
      className={`line-through text-red-600 bg-red-50 ${onClick ? 'cursor-pointer hover:bg-red-100' : ''}`}
      onClick={onClick}
    >
      {children}
    </span>
  )

  const TrackAdded = ({ children, onClick }: { children: React.ReactNode, onClick?: () => void }) => (
    <span 
      className={`bg-green-200 text-green-800 ${onClick ? 'cursor-pointer hover:bg-green-300' : ''}`}
      onClick={onClick}
    >
      {children}
    </span>
  )

  const PurpleUnderline = ({ children, isActive }: { children: React.ReactNode, isActive: boolean }) => (
    <span 
      className={`${isActive ? 'border-b-2 border-purple-500 bg-purple-50' : ''} transition-all duration-300`}
    >
      {children}
    </span>
  )

  const TrackChanges = ({ 
    original, 
    suggested, 
    flagTitle 
  }: { 
    original: string, 
    suggested: string, 
    flagTitle: string 
  }) => {
    const handleClick = () => {
      const flagItem = [...ipProtectionItems, ...enforceabilityItems].find(item => item.title === flagTitle)
      if (flagItem) {
        openChildItemChat(flagItem)
      }
    }

    // Show direct application if directApplyEnabled is true
    if (directApplyEnabled && reviewRun) {
      return <>{suggested}</>
    }

    // Show track changes if auto-apply is enabled OR if this specific flag is previewed
    const showTrackChanges = (autoApplyEnabled && reviewRun) || previewedFlags.includes(flagTitle)
    
    // Show accepted changes with purple underline if this flag is accepted
    const isAccepted = acceptedFlags.includes(flagTitle)
    const showPurpleUnderline = purpleUnderlines[flagTitle] && isAccepted

    if (isAccepted) {
      return (
        <PurpleUnderline isActive={showPurpleUnderline}>
          {suggested}
        </PurpleUnderline>
      )
    }

    if (showTrackChanges) {
      return (
        <>
          <TrackDeleted onClick={handleClick}>{original}</TrackDeleted>
          <TrackAdded onClick={handleClick}>{suggested}</TrackAdded>
        </>
      )
    }

    // Default: show original text
    return <>{original}</>
  }

  // Helper function to format lifecycle content with proper headings and line breaks
  const formatLifecycleContent = (content: string) => {
    const sections = content.split('\n\n')
    
    // Function to handle clause title clicks and scroll to relevant sections
    const handleClauseClick = (clauseTitle: string) => {
      setTimeout(() => {
        if (clauseTitle.includes("Clause 2") || clauseTitle.includes("Obligations of Confidentiality")) {
          agreedTermsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        } else if (clauseTitle.includes("Clause 4") || clauseTitle.includes("Term")) {
          termRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        } else if (clauseTitle.includes("Clause 5") || clauseTitle.includes("Return or Destruction")) {
          returnDestructionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        } else if (clauseTitle.includes("Remedies")) {
          remediesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        } else if (clauseTitle.includes("Lifecycle of Confidential Information")) {
          // Scroll to the lifecycle section if it exists in the document
          const allHeadings = document.querySelectorAll('h2')
          const lifecycleHeading = Array.from(allHeadings).find(h => h.textContent?.includes("Lifecycle of Confidential Information"))
          if (lifecycleHeading) {
            lifecycleHeading.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        }
      }, 100)
    }

    return (
      <div className="space-y-4">
        {sections.map((section, index) => {
          if (section.startsWith('**') && section.includes('**')) {
            const lines = section.split('\n')
            const title = lines[0].replace(/\*\*/g, '')
            const body = lines.slice(1).join('\n')
            
            // Check if this is a clause title that should be clickable
            const isClauseTitle = title.includes("Clause") || title.includes("New Clause")
            
            return (
              <div key={index}>
                {isClauseTitle ? (
                  <button
                    onClick={() => handleClauseClick(title)}
                    className="font-semibold text-blue-800 underline hover:text-blue-900 mb-1 text-left cursor-pointer"
                  >
                    {title}
                  </button>
                ) : (
                  <div className="font-semibold text-gray-900 mb-1">{title}</div>
                )}
                <div className="text-sm text-gray-700 italic">{body}</div>
              </div>
            )
          } else {
            return (
              <div key={index} className="text-sm text-gray-700 italic">
                {section}
              </div>
            )
          }
        })}
      </div>
    )
  }

  // Functions to handle individual flag actions
  const handlePreviewFlag = (flagTitle: string) => {
    if (!previewedFlags.includes(flagTitle)) {
      setPreviewedFlags(prev => [...prev, flagTitle])
    }
  }

  const handleAcceptFlag = (flagTitle: string) => {
    if (!acceptedFlags.includes(flagTitle)) {
      setAcceptedFlags(prev => [...prev, flagTitle])
      
      // Add purple underline animation
      setPurpleUnderlines(prev => ({ ...prev, [flagTitle]: true }))
      
      // Remove purple underline after 3 seconds
      setTimeout(() => {
        setPurpleUnderlines(prev => ({ ...prev, [flagTitle]: false }))
      }, 3000)
    }
  }

  // Function to count track changes per flag
  const getTrackChangesForFlag = (flagTitle: string) => {
    const changes = []
    
    switch (flagTitle) {
      case "Loophole: Unverified Prior Knowledge Claim":
        changes.push({ ref: section3Ref, description: "Prior knowledge evidence requirement" })
        break
      case "Premature Exit: Unilateral Early Termination":
        changes.push({ ref: termRef, description: "Termination rights restriction" })
        break
      case "Untrackable Oral Disclosures":
        changes.push({ ref: backgroundRef, description: "Oral disclosure confirmation requirement" })
        break
      case "Vague Deadline: Unclear Return Timeline":
        changes.push({ ref: returnDestructionRef, description: "Specific return timeline" })
        break
      case "Jurisdiction Gap: No Legal Venue Set":
        changes.push({ ref: remediesRef, description: "Legal jurisdiction specification" })
        break
      case "Incomplete Confidentiality Lifecycle Controls":
        changes.push(
          { ref: agreedTermsRef, description: "Safeguards requirement" },
          { ref: termRef, description: "Survival clause" },
          { ref: returnDestructionRef, description: "Certification and backup requirements" },
          { ref: null, description: "New lifecycle clause" } // This will need special handling
        )
        break
    }
    
    return changes
  }

  // Function to navigate to specific edit
  const navigateToEdit = (flagTitle: string, editIndex: number) => {
    const changes = getTrackChangesForFlag(flagTitle)
    if (editIndex >= 0 && editIndex < changes.length) {
      setCurrentEditIndex(prev => ({ ...prev, [flagTitle]: editIndex }))
      
      const change = changes[editIndex]
      if (change.ref?.current) {
        setTimeout(() => {
          change.ref.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        }, 100)
      } else if (change.description === "New lifecycle clause") {
        // Handle the lifecycle clause which is conditionally rendered
        setTimeout(() => {
          const allHeadings = document.querySelectorAll('h2')
          const lifecycleHeading = Array.from(allHeadings).find(h => h.textContent?.includes("Lifecycle of Confidential Information"))
          if (lifecycleHeading) {
            lifecycleHeading.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        }, 100)
      }
    }
  }

  // Function to handle accept all edits for a specific flag
  const handleAcceptAllForFlag = (flagTitle: string) => {
    handleAcceptFlag(flagTitle)
  }

  // Function to handle reject all edits for a specific flag
  const handleRejectAllForFlag = (flagTitle: string) => {
    setPreviewedFlags(prev => prev.filter(flag => flag !== flagTitle))
    setAcceptedFlags(prev => prev.filter(flag => flag !== flagTitle))
  }

  // Function to handle undo direct application for a specific flag
  const handleUndoDirectApplication = (flagTitle: string) => {
    // Switch from direct application back to manual mode
    setDirectApplyEnabled(false)
    setAutoApplyEnabled(false)
    // This will cause the document to show original text and the chat to show "Suggested" tab with buttons
  }

  // Function to check if a document section should have purple margin highlight
  const shouldHighlightSection = (sectionName: string) => {
    if (!selectedChildItem) return false
    
    const flagTitle = selectedChildItem.title
    
    switch (flagTitle) {
      case "Loophole: Unverified Prior Knowledge Claim":
        return sectionName === "exclusions"
      case "Premature Exit: Unilateral Early Termination":
        return sectionName === "term"
      case "Untrackable Oral Disclosures":
        return sectionName === "confidentialInfo"
      case "Vague Deadline: Unclear Return Timeline":
        return sectionName === "returnDestruction"
      case "Jurisdiction Gap: No Legal Venue Set":
        return sectionName === "remedies"
      case "Incomplete Confidentiality Lifecycle Controls":
        return sectionName === "obligations" || sectionName === "term" || sectionName === "returnDestruction" || sectionName === "lifecycle"
      default:
        return false
    }
  }

  return (
    <div className="flex min-h-screen bg-[#F9F9F9]" data-testid="contract-review-container">
      {/* Left Panel - Fixed width for prompt and history */}
      {showLeftPanel ? (
        <motion.div
          className="flex flex-col bg-white fixed top-0 left-0 bottom-0 overflow-hidden border-r border-gray-200 z-10"
          style={{ width: "300px" }}
          data-testid="left-panel"
          variants={leftPanelAnimationVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Logo and top buttons */}
          <div className="p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between mb-1">
              <div className="w-7 h-7 flex items-center justify-center">
                <svg width="20" height="32" viewBox="0 0 22 35" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g clipPath="url(#clip0_4342_62730)">
                    <path
                      d="M12.3154 3.60101C12.3154 4.15294 11.8918 4.61736 11.3344 4.75198C11.2303 4.7789 11.1188 4.79236 11.0073 4.79236C10.8958 4.79236 10.7844 4.7789 10.6803 4.75198C10.1154 4.61736 9.69922 4.15294 9.69922 3.60101C9.69922 2.9414 10.2938 2.40967 11.0148 2.40967C11.7357 2.40967 12.3154 2.94813 12.3154 3.60101Z"
                      fill="#3D1152"
                    />
                    <path d="M18.4172 34.9329H3.58203L4.54081 32.9541H17.4584L18.4172 34.9329Z" fill="#3D1152" />
                    <path
                      d="M21.5466 23.2617L17.4588 32.355H11V24.9781C12.0851 24.9781 12.9696 24.1771 12.9696 23.1944C12.9696 22.3127 12.2561 21.579 11.327 21.4377V5.35787C12.2561 5.21653 12.9696 4.48287 12.9696 3.60114C12.9696 2.61845 12.0851 1.81749 11 1.81749V0.511719C12.925 0.511719 14.5007 1.93191 14.5007 3.67518C14.5007 4.16653 14.3743 4.63768 14.1365 5.07518C14.0399 5.25691 13.9284 5.42518 13.7946 5.57999C13.4081 6.04441 13.1628 6.42806 12.9919 6.81845C12.7689 7.4848 12.6277 8.15114 12.5682 8.80402C11.8027 16.6184 21.5466 23.2617 21.5466 23.2617Z"
                      fill="#5C0F8B"
                    />
                    <path
                      d="M0.453125 23.2617L4.54096 32.355H10.9997V24.9781C9.91461 24.9781 9.03015 24.1771 9.03015 23.1944C9.03015 22.3127 9.74367 21.579 10.6727 21.4377V5.35787C9.74367 5.21653 9.03015 4.48287 9.03015 3.60114C9.03015 2.61845 9.91461 1.81749 10.9997 1.81749V0.511719C9.07475 0.511719 7.49907 1.93191 7.49907 3.67518C7.49907 4.16653 7.62542 4.63768 7.86326 5.07518C7.95988 5.25691 8.07137 5.42518 8.20515 5.57999C8.59164 6.04441 8.83691 6.42806 9.00786 6.81845C9.23083 7.4848 9.37204 8.15114 9.4315 8.80402C10.197 16.6184 0.453125 23.2617 0.453125 23.2617Z"
                      fill="#3D1152"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_4342_62730">
                      <rect width="22" height="35" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
              </div>
              <button
                className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                onClick={toggleLeftPanel}
                aria-label="Collapse panel"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            <div className="w-full">
              <Button
                className="w-full h-9 bg-[#7C3AED] text-white hover:bg-[#6D28D9] rounded-full flex items-center justify-center"
                onClick={() => {
                  setActiveChat({
                    id: Date.now().toString(),
                    title: "New chat",
                    messages: [],
                    createdAt: new Date(),
                  })
                  setShowBottomPanel(false)
                  setCurrentTab("done")
                }}
                data-testid="new-chat-button"
              >
                <Plus className="mr-2 h-5 w-5" /> New Chat
              </Button>
            </div>
          </div>

          {/* Rest of the expanded left panel content remains the same */}
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                className={`px-3 py-2 text-xs font-medium ${currentTab === "todo" ? "text-[#7C3AED] border-b-2 border-[#7C3AED]" : "text-gray-500"}`}
                onClick={() => setCurrentTab("todo")}
              >
                To Review {reviewRun ? allTasks.filter((item) => !resolvedItems.includes(item.title)).length : 0}
              </button>
              <button
                className={`px-3 py-2 text-xs font-medium ${currentTab === "done" ? "text-[#7C3AED] border-b-2 border-[#7C3AED]" : "text-gray-500"}`}
                onClick={() => setCurrentTab("done")}
              >
                History {resolvedChats.length + resolvedItems.length}
              </button>
            </div>
          </div>

          {/* Priority filter */}
          {currentTab === "todo" && reviewRun && (
            <div className="px-3 py-2 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Priority:</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 rounded-full border text-xs flex items-center gap-1 px-2 py-0"
                >
                  <div className="h-2 w-2 rounded-full bg-yellow-400" />
                  <span className="text-xs">Medium</span>
                  <ChevronRight className="h-3 w-3 rotate-90 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Tasks list */}
          <div className="flex-1 overflow-auto" data-testid="tasks-list-container">
            <div className="px-3 py-2" data-testid="tasks-list">
              {currentTab === "todo" && reviewRun ? (
                <>
                  {getCurrentList().map((item, index) => (
                    <motion.div
                      key={index}
                      className="py-2 border-b border-gray-100"
                      data-testid={`risk-item-${item.title.replace(/\s+/g, "-").toLowerCase()}`}
                      custom={index}
                      initial={animateRiskItems ? "hidden" : "visible"}
                      animate="visible"
                      variants={riskItemAnimationVariants}
                    >
                      <div
                        className="rounded-lg p-2 transition-colors hover:bg-gray-50 cursor-pointer"
                        onClick={() => openChildItemChat(item)}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className={`h-2 w-2 mt-1.5 rounded-full flex-shrink-0 ${
                              item.severity === "High" ? "bg-red-500" : "bg-yellow-400"
                            }`}
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 text-xs">{item.title}</div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </>
              ) : currentTab === "done" ? (
                <>
                  {(historyFilter === "all" || historyFilter === "risks") && getCurrentList().length > 0 && (
                    <>
                      {getCurrentList().map((item, index) => (
                        <div
                          key={`resolved-${index}`}
                          className="py-2 border-b border-gray-100"
                          data-testid={`resolved-risk-item-${item.title.replace(/\s+/g, "-").toLowerCase()}`}
                        >
                          <div
                            className="rounded-lg p-2 transition-colors hover:bg-gray-50 cursor-pointer"
                            onClick={() => openChildItemChat(item)}
                          >
                            <div className="flex items-start gap-2">
                              <div
                                className={`h-2 w-2 mt-1.5 rounded-full flex-shrink-0 ${
                                  item.severity === "High" ? "bg-red-500" : "bg-yellow-400"
                                }`}
                              />
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 text-xs">{item.title}</div>
                              </div>
                              <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {(historyFilter === "all" || historyFilter === "chats") && resolvedChats.length > 0 && (
                    <>
                      {resolvedChats.map((chat, index) => (
                        <motion.div
                          key={chat.id}
                          className="py-2 border-b border-gray-100"
                          data-testid={`resolved-chat-${chat.id}`}
                          custom={index}
                          initial={animateChatHistory ? "hidden" : "visible"}
                          animate="visible"
                          variants={chatHistoryAnimationVariants}
                        >
                          <div
                            className="rounded-lg p-2 transition-colors hover:bg-gray-50 cursor-pointer"
                            onClick={() => openResolvedChat(chat)}
                          >
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-3 w-3 text-[#7C3AED]" />
                              <span className="font-medium text-gray-900 text-xs">{chat.title}</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </>
                  )}
                </>
              ) : (
                // Show initial message before running review
                <div className="flex flex-col items-start py-6 px-3">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-gray-900">Run a custom AI Risk Review</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    Genie will flag high and medium risks based on your priorities and concerns.
                  </p>
                  <Button
                    variant="secondary"
                    className="bg-[#7C3AED] text-white hover:bg-[#6D28D9] text-xs h-7"
                    onClick={handleRunReview}
                  >
                    Review document
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Mark all as reviewed */}
          {currentTab === "todo" && reviewRun && getCurrentList().length > 0 && (
            <div className="p-3 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="mark-all"
                  className="h-3 w-3 rounded text-[#7C3AED] focus:ring-[#7C3AED] border-gray-300"
                  onChange={() => {
                    const allUnresolvedItems = [...ipProtectionItems, ...enforceabilityItems].filter(
                      (item) => !resolvedItems.includes(item.title),
                    )
                    setResolvedItems((prev) => [...prev, ...allUnresolvedItems.map((item) => item.title)])
                  }}
                />
                <label htmlFor="mark-all" className="text-xs text-gray-700">
                  Mark all as Reviewed
                </label>
              </div>
            </div>
          )}
        </motion.div>
      ) : (
        // Collapsed left panel
        <motion.div
          className="flex flex-col items-center bg-white fixed top-0 left-0 bottom-0 overflow-hidden border-r border-gray-200 z-10"
          style={{ width: "50px" }}
          data-testid="collapsed-left-panel"
        >
          <div className="py-3 flex flex-col items-center gap-5 w-full">
            {/* Logo */}
            <div className="w-7 h-7 flex items-center justify-center">
              <svg width="18" height="28" viewBox="0 0 22 35" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clipPath="url(#clip0_4342_62730)">
                  <path
                    d="M12.3154 3.60101C12.3154 4.15294 11.8918 4.61736 11.3344 4.75198C11.2303 4.7789 11.1188 4.79236 11.0073 4.79236C10.8958 4.79236 10.7844 4.7789 10.6803 4.75198C10.1154 4.61736 9.69922 4.15294 9.69922 3.60101C9.69922 2.9414 10.2938 2.40967 11.0148 2.40967C11.7357 2.40967 12.3154 2.94813 12.3154 3.60101Z"
                      fill="#3D1152"
                  />
                  <path d="M18.4172 34.9329H3.58203L4.54081 32.9541H17.4584L18.4172 34.9329Z" fill="#3D1152" />
                  <path
                    d="M21.5466 23.2617L17.4588 32.355H11V24.9781C12.0851 24.9781 12.9696 24.1771 12.9696 23.1944C12.9696 22.3127 12.2561 21.579 11.327 21.4377V5.35787C12.2561 5.21653 12.9696 4.48287 12.9696 3.60114C12.9696 2.61845 12.0851 1.81749 11 1.81749V0.511719C12.925 0.511719 14.5007 1.93191 14.5007 3.67518C14.5007 4.16653 14.3743 4.63768 14.1365 5.07518C14.0399 5.25691 13.9284 5.42518 13.7946 5.57999C13.4081 6.04441 13.1628 6.42806 12.9919 6.81845C12.7689 7.4848 12.6277 8.15114 12.5682 8.80402C11.8027 16.6184 21.5466 23.2617 21.5466 23.2617Z"
                    fill="#5C0F8B"
                  />
                  <path
                    d="M0.453125 23.2617L4.54096 32.355H10.9997V24.9781C9.91461 24.9781 9.03015 24.1771 9.03015 23.1944C9.03015 22.3127 9.74367 21.579 10.6727 21.4377V5.35787C9.74367 5.21653 9.03015 4.48287 9.03015 3.60114C9.03015 2.61845 9.91461 1.81749 10.9997 1.81749V0.511719C9.07475 0.511719 7.49907 1.93191 7.49907 3.67518C7.49907 4.16653 7.62542 4.63768 7.86326 5.07518C7.95988 5.25691 8.07137 5.42518 8.20515 5.57999C8.59164 6.04441 8.83691 6.42806 9.00786 6.81845C9.23083 7.4848 9.37204 8.15114 9.4315 8.80402C10.197 16.6184 0.453125 23.2617 0.453125 23.2617Z"
                    fill="#3D1152"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_4342_62730">
                    <rect width="22" height="35" fill="white" />
                  </clipPath>
                </defs>
              </svg>
            </div>

            {/* Toggle button */}
            <button
              className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
              onClick={toggleLeftPanel}
              aria-label="Expand panel"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* New Chat button */}
            <button
              className="w-8 h-8 bg-[#7C3AED] text-white rounded-full flex items-center justify-center hover:bg-[#6D28D9]"
              onClick={() => {
                setActiveChat({
                  id: Date.now().toString(),
                  title: "New chat",
                  messages: [],
                  createdAt: new Date(),
                })
                setShowBottomPanel(false)
                setCurrentTab("done")
              }}
              aria-label="New Chat"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Middle Panel - Chat or Child Item Chat */}
      <motion.div
        className="fixed top-0 bottom-0 bg-white border-r border-gray-200"
        style={{
          left: showLeftPanel ? "300px" : "50px",
          width: "415px",
          transition: "left 0.3s ease-in-out",
        }}
        data-testid="middle-panel"
      >
        <AnimatePresence mode="wait">
          {activeChat && (
            <motion.div
              key="active-chat"
              className="flex h-full flex-col"
              data-testid="active-chat-container"
              variants={chatAnimationVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="flex items-center justify-between border-b border-gray-200 p-4" data-testid="chat-header">
                <div className="flex items-center gap-2">
                  {showLeftPanel && (
                    <button className="p-1 text-gray-500 hover:text-gray-700" onClick={handleCloseChat}>
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  )}
                  <h2 className="font-medium text-gray-900">{activeChat.title}</h2>
                </div>
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCloseChat}
                    data-testid="close-chat-button"
                    disabled={isProcessingReview}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 p-4" data-testid="chat-messages-area">
                <div className="flex flex-col justify-end min-h-full space-y-4">
                  {activeChat.messages.length === 0 ? (
                    <div className="flex flex-col h-full">
                      <div className="flex-grow"></div>
                      <div className="flex flex-col gap-3 mb-6 items-center">
                        <div className="text-center text-sm text-gray-500 mb-4">
                          <div className="flex justify-center mb-2">
                            <svg
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <circle cx="12" cy="12" r="10" fill="#7C3AED" />
                            </svg>
                          </div>
                          This chat is private to you and Genie
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full text-sm h-9 w-[200px] border-2 border-[#7C3AED] text-[#7C3AED] hover:bg-[#F9F5FF] hover:text-[#7C3AED] mb-2"
                          onClick={handleRunReview}
                          data-testid="run-ai-review-button"
                        >
                          <FileSearch className="mr-3 h-4 w-4" />
                          Run AI Review
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full text-sm h-9 w-[200px]"
                          data-testid="summarize-document-button"
                        >
                          <Sparkles className="mr-3 h-4 w-4 text-[#7C3AED]" />
                          Summarise document
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full text-sm h-9 w-[200px]"
                          data-testid="extract-terms-button"
                        >
                          <GitCompare className="mr-3 h-4 w-4 text-[#7C3AED]" />
                          Extract commercial terms
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {activeChat.messages.map((message) => {
                        if (message.type === "user") {
                          return (
                            <div
                              key={message.id}
                              className="flex justify-end"
                              data-testid={`user-message-${message.id}`}
                            >
                              <div className="flex items-end gap-2">
                                <div className="rounded-2xl bg-[#7C3AED] px-4 py-2 text-white max-w-[80%]">
                                  <p className="text-sm">{message.content}</p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-purple-100 flex-shrink-0 overflow-hidden">
                                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path
                                      d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21"
                                      stroke="#7C3AED"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          )
                        }

                        if (message.type === "ai" && message.content === "config-form") {
                          return (
                            <div className="flex flex-col gap-3">
                              <ReviewConfigForm
                                onSubmit={(values) => {
                                  // Add the form submission as a user message
                                  setActiveChat((prev) => {
                                    if (!prev) return null
                                    return {
                                      ...prev,
                                      messages: [
                                        ...prev.messages,
                                        {
                                          id: Date.now().toString(),
                                          type: "user",
                                          content: `Document type: ${values.documentType}\nGoverning law: ${values.governingLaw}\nParty: ${values.party}`,
                                        },
                                        {
                                          id: (Date.now() + 1).toString(),
                                          type: "ai",
                                          content:
                                            "Please give Genie as much information as possible to help tailor your review.\n\nThe more you write, the better your review will be.\n\nFor example:\nBackground on your business and the other party\nAny key concerns or risks\nYour top priorities for handling this contract",
                                        },
                                      ],
                                    }
                                  })
                                }}
                              />
                            </div>
                          )
                        }

                        if (message.type === "ai" && message.content === "auto-apply-question") {
                          return (
                            <div key={message.id} className="flex flex-col gap-3" data-testid={`auto-apply-question-${message.id}`}>
                              <div className="flex items-end gap-2">
                                <div className="w-8 h-8 rounded-full bg-purple-100 flex-shrink-0 overflow-hidden">
                                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" fill="#7C3AED" />
                                  </svg>
                                </div>
                                <div className="rounded-2xl bg-gray-100 px-4 py-3 max-w-[80%]">
                                  <p className="text-sm text-gray-900 mb-4 whitespace-pre-line">
                                    I'll make editing suggestions to mitigate any issues I find.{"\n\n"}Would you prefer to:
                                  </p>
                                  <div className="space-y-3">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                      <input
                                        type="radio"
                                        name="edit-preference"
                                        value="manual"
                                        checked={autoApplySelection === "manual"}
                                        onChange={() => setAutoApplySelection("manual")}
                                        className="w-4 h-4 text-[#7C3AED] border-gray-300 focus:ring-[#7C3AED]"
                                      />
                                      <span className="text-sm text-gray-700">Choose manually any edits to apply</span>
                                    </label>
                                    
                                    <label className="flex items-center gap-3 cursor-pointer">
                                      <input
                                        type="radio"
                                        name="edit-preference"
                                        value="direct"
                                        checked={autoApplySelection === "direct"}
                                        onChange={() => setAutoApplySelection("direct")}
                                        className="w-4 h-4 text-[#7C3AED] border-gray-300 focus:ring-[#7C3AED]"
                                      />
                                      <span className="text-sm text-gray-700">Apply edits directly in the document</span>
                                    </label>
                                    
                                    <label className="flex items-center gap-3 cursor-pointer">
                                      <input
                                        type="radio"
                                        name="edit-preference"
                                        value="track_changes"
                                        checked={autoApplySelection === "track_changes"}
                                        onChange={() => setAutoApplySelection("track_changes")}
                                        className="w-4 h-4 text-[#7C3AED] border-gray-300 focus:ring-[#7C3AED]"
                                      />
                                      <span className="text-sm text-gray-700">Apply edits in track changes</span>
                                    </label>
                                  </div>
                                  
                                  <div className="flex justify-end mt-4">
                                    <Button
                                      size="sm"
                                      className="h-10 px-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
                                      disabled={!autoApplySelection}
                                      onClick={() => {
                                        // Add small delay to show selection, then proceed
                                        setTimeout(() => {
                                          // Set the appropriate modes based on selection
                                          if (autoApplySelection === "manual") {
                                            setAutoApplyEnabled(false)
                                            setDirectApplyEnabled(false)
                                          } else if (autoApplySelection === "direct") {
                                            setAutoApplyEnabled(false)
                                            setDirectApplyEnabled(true)
                                          } else if (autoApplySelection === "track_changes") {
                                            setAutoApplyEnabled(true)
                                            setDirectApplyEnabled(false)
                                          }
                                          
                                          // Add user response and proceed to thank you
                                          setActiveChat((prev) => {
                                            if (!prev) return null
                                            const selectedOption = autoApplySelection === "manual" ? "Choose manually any edits to apply" :
                                                                 autoApplySelection === "direct" ? "Apply edits directly in the document" :
                                                                 "Apply edits in track changes"
                                            
                                            const updatedMessages = [
                                              ...prev.messages,
                                              {
                                                id: Date.now().toString(),
                                                type: "user",
                                                content: selectedOption,
                                              },
                                              {
                                                id: (Date.now() + 1).toString(),
                                                type: "ai",
                                                content:
                                                  "Thank you!\n\nWe're running your tailored AI risk review now. This might take a couple of minutes.",
                                                isLoading: true,
                                              },
                                            ]

                                            // Set processing state to true
                                            setIsProcessingReview(true)

                                            // After 4 seconds, complete the review
                                            setTimeout(() => {
                                              setIsProcessingReview(false)
                                              startReview()
                                            }, 4000)

                                            return {
                                              ...prev,
                                              messages: updatedMessages,
                                            }
                                          })
                                          setPrompt("")
                                        }, 300)
                                      }}
                                    >
                                      Continue
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        }

                        if (message.type === "ai") {
                          // Handle structured risk content
                          if (message.content === "structured-risk-content") {
                            return (
                              <div
                                key={message.id}
                                className="flex flex-col gap-3"
                                data-testid={`risk-ai-message-${message.id}`}
                              >
                                <div className="flex items-start gap-2">
                                  <div className="w-8 h-8 rounded-full bg-purple-100 flex-shrink-0 overflow-hidden mt-1">
                                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <circle cx="12" cy="12" r="10" fill="#7C3AED" />
                                    </svg>
                                  </div>
                                  <div className="flex-1 bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <h3 className="font-medium text-gray-900">
                                        Loophole: Unverified Prior Knowledge Claim
                                      </h3>
                                      <ChevronUp className="h-4 w-4 text-gray-400" />
                                    </div>

                                    <p className="text-sm text-gray-700 mb-4">
                                      Certain exclusions allow the Receiving Party to claim they already knew
                                      information without any proof, creating a potential loophole for misuse.
                                    </p>

                                    <Tabs defaultValue="suggested" className="w-full">
                                      <TabsList className="grid w-full grid-cols-2 bg-white">
                                        <TabsTrigger value="original" className="text-sm">
                                          Original
                                        </TabsTrigger>
                                        <TabsTrigger value="suggested" className="text-sm">
                                          {directApplyEnabled ? "New wording" : "Suggested"}
                                        </TabsTrigger>
                                      </TabsList>

                                      <TabsContent value="original" className="mt-3">
                                        <div className="bg-white rounded-md p-3 border">
                                          <p className="text-sm text-gray-700 italic">
                                            "...information that is already known to the Receiving Party..."
                                          </p>
                                        </div>
                                      </TabsContent>

                                      <TabsContent value="suggested" className="mt-3">
                                        <div className="bg-white rounded-md p-3 border">
                                          <p className="text-sm text-gray-700 italic mb-3">
                                            "...information that is already known to the Receiving Party, as evidenced
                                            by written records created prior to disclosure."
                                          </p>

                                          <div className="border-t pt-3">
                                            <p className="text-xs font-medium text-[#7C3AED] mb-1">Why this helps:</p>
                                            <p className="text-xs text-gray-600">
                                              Adds a documentation requirement, preventing false retrospective claims and
                                              preserving the NDA's enforceability.
                                            </p>
                                          </div>
                                          {directApplyEnabled && reviewRun && (
                                            <div className="border-t pt-3 mt-3">
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-xs h-7 px-3 border-gray-300 text-gray-600 hover:bg-gray-50"
                                                onClick={() => handleUndoDirectApplication("Loophole: Unverified Prior Knowledge Claim")}
                                              >
                                                Undo
                                              </Button>
                                            </div>
                                          )}
                                          {!autoApplyEnabled && !directApplyEnabled && reviewRun && (
                                            <div className="border-t pt-3 mt-3">
                                              <div className="flex gap-2">
                                                <Button
                                                  size="sm"
                                                  className="flex-1 text-xs h-8 bg-[#7C3AED] hover:bg-[#6D28D9]"
                                                  onClick={() => handleAcceptFlag("Loophole: Unverified Prior Knowledge Claim")}
                                                  disabled={acceptedFlags.includes("Loophole: Unverified Prior Knowledge Claim")}
                                                >
                                                  {acceptedFlags.includes("Loophole: Unverified Prior Knowledge Claim") ? "Accepted" : "Accept change"}
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="flex-1 text-xs h-8 border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white"
                                                  onClick={() => handlePreviewFlag("Loophole: Unverified Prior Knowledge Claim")}
                                                  disabled={previewedFlags.includes("Loophole: Unverified Prior Knowledge Claim") || acceptedFlags.includes("Loophole: Unverified Prior Knowledge Claim")}
                                                >
                                                  {previewedFlags.includes("Loophole: Unverified Prior Knowledge Claim") ? "Showing in doc" : "Show in track changes"}
                                                </Button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </TabsContent>
                                    </Tabs>
                                  </div>
                                </div>
                              </div>
                            )
                          }

                          // Handle placeholder structured content for other risk flags
                          if (message.content === "structured-risk-content-placeholder") {
                            const getContentForItem = (title: string) => {
                              switch (title) {
                                case "Premature Exit: Unilateral Early Termination":
                                  return {
                                    description: "Allowing either party to terminate at will undermines the confidentiality period and could expose the Disclosing Party to post-termination misuse.",
                                    original: "\"…unless terminated earlier by either party with 30 days' notice.\"",
                                    suggested: "\"…unless terminated earlier by mutual written agreement or by the Disclosing Party with 30 days' notice.\"",
                                    why: "Prevents the Receiving Party from exiting unilaterally while still in possession of sensitive information, giving the Disclosing Party more control."
                                  }
                                case "Untrackable Oral Disclosures":
                                  return {
                                    description: "The agreement treats oral and written disclosures equally but provides no way to verify oral information was actually disclosed, making enforcement difficult.",
                                    original: "\"…whether oral or written…\"",
                                    suggested: "\"…whether oral or written, provided that oral disclosures are confirmed in writing and marked as confidential within 15 days.\"",
                                    why: "Introduces a record-keeping requirement that strengthens evidentiary support for oral disclosures."
                                  }
                                case "Vague Deadline: Unclear Return Timeline":
                                  return {
                                    description: "\"Reasonable period\" is subjective and could delay the return or destruction of sensitive materials.",
                                    original: "\"…shall return or destroy all Confidential Information within a reasonable period.\"",
                                    suggested: "\"…shall return or destroy all Confidential Information within 10 business days of termination of this Agreement.\"",
                                    why: "Creates a clear, enforceable timeline, helping avoid disputes and delays."
                                  }
                                case "Jurisdiction Gap: No Legal Venue Set":
                                  return {
                                    description: "The remedies clause allows for injunctive relief but does not specify the legal jurisdiction, opening the door to venue disputes.",
                                    original: "\"The Disclosing Party is entitled to seek injunctive relief…\"",
                                    suggested: "\"The Disclosing Party is entitled to seek injunctive relief in the courts of England and Wales [or relevant jurisdiction]…\"",
                                    why: "Establishes where legal disputes will be resolved, ensuring smoother enforcement."
                                  }
                                case "Incomplete Confidentiality Lifecycle Controls":
                                  return {
                                    description: "The NDA contains several strong protections for confidential information, but it still lacks unified lifecycle management. There's no explicit link between how confidential information is defined, handled during the agreement, and controlled after termination—leaving the contract potentially vulnerable to misinterpretation or non-compliance.",
                                    original: "**Clause 2 – Obligations of Confidentiality**\n\"The Receiving Party agrees not to disclose, copy, or use the Confidential Information for any purpose other than evaluating a potential business relationship.\"\n\n**Clause 4 – Term**\n\"This Agreement shall remain in effect for two (2) years from the Effective Date, unless terminated earlier by either party with 30 days' notice.\"\n\n**Clause 5 – Return or Destruction**\n\"Upon termination, the Receiving Party shall return or destroy all Confidential Information within a reasonable period.\"\n\n**No additional lifecycle coordination clause currently exists.**",
                                    suggested: "**Clause 2 – Obligations of Confidentiality**\nAdd: \"The Receiving Party shall implement reasonable administrative, technical, and physical safeguards to protect Confidential Information from unauthorized use or disclosure.\"\n\n**Clause 4 – Term**\nAdd: \"Notwithstanding any termination of this Agreement, the confidentiality obligations in Clause 2 shall survive for five (5) years from the date of disclosure of the relevant Confidential Information.\"\n\n**Clause 5 – Return or Destruction**\nAdd: \"The Receiving Party shall certify such destruction in writing. Backups containing Confidential Information shall also be deleted where feasible.\"\n\n**New Clause – Lifecycle of Confidential Information**\n\"The Parties agree that confidentiality obligations should be interpreted consistently across the Agreement, including identification, protection, and return of Confidential Information. In the event of ambiguity or conflict between clauses, the interpretation that provides the highest level of protection to the Disclosing Party shall apply.\"",
                                    why: "These edits close lifecycle gaps by aligning definition, handling, post-termination obligations, and enforcement of confidentiality duties. They prevent information from falling through procedural cracks and reduce risk exposure by coordinating obligations across multiple clauses."
                                  }
                                default:
                                  return {
                                    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
                                    original: "\"Lorem ipsum dolor sit amet, consectetur adipiscing elit...\"",
                                    suggested: "\"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\"",
                                    why: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
                                  }
                              }
                            }

                            const content = getContentForItem(selectedChildItem?.title || "")

                            return (
                              <div
                                key={message.id}
                                className="flex flex-col gap-3"
                                data-testid={`risk-ai-message-${message.id}`}
                              >
                                <div className="flex items-start gap-2">
                                  <div className="w-8 h-8 rounded-full bg-purple-100 flex-shrink-0 overflow-hidden mt-1">
                                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <circle cx="12" cy="12" r="10" fill="#7C3AED" />
                                    </svg>
                                  </div>
                                  <div className="flex-1 bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <h3 className="font-medium text-gray-900">{selectedChildItem?.title}</h3>
                                      <ChevronUp className="h-4 w-4 text-gray-400" />
                                    </div>

                                    <p className="text-sm text-gray-700 mb-4">
                                      {content.description}
                                    </p>

                                    <Tabs defaultValue="suggested" className="w-full">
                                      <TabsList className="grid w-full grid-cols-2 bg-white">
                                        <TabsTrigger value="original" className="text-sm">
                                          Original
                                        </TabsTrigger>
                                        <TabsTrigger value="suggested" className="text-sm">
                                          {directApplyEnabled ? "New wording" : "Suggested"}
                                        </TabsTrigger>
                                      </TabsList>

                                      <TabsContent value="original" className="mt-3">
                                        <div className="bg-white rounded-md p-3 border">
                                          {selectedChildItem?.title === "Incomplete Confidentiality Lifecycle Controls" ? (
                                            formatLifecycleContent(content.original)
                                          ) : (
                                            <p className="text-sm text-gray-700 italic">
                                              {content.original}
                                            </p>
                                          )}
                                        </div>
                                      </TabsContent>

                                      <TabsContent value="suggested" className="mt-3">
                                        <div className="bg-white rounded-md p-3 border">
                                          {selectedChildItem?.title === "Incomplete Confidentiality Lifecycle Controls" ? (
                                            <>
                                              {formatLifecycleContent(content.suggested)}
                                              <div className="border-t pt-3 mt-4">
                                                <p className="text-xs font-medium text-[#7C3AED] mb-1">Why this helps:</p>
                                                <p className="text-xs text-gray-600">
                                                  {content.why}
                                                </p>
                                              </div>
                                              {directApplyEnabled && reviewRun && (
                                                <div className="border-t pt-3 mt-4">
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-xs h-7 px-3 border-gray-300 text-gray-600 hover:bg-gray-50"
                                                    onClick={() => handleUndoDirectApplication(selectedChildItem.title)}
                                                  >
                                                    Undo
                                                  </Button>
                                                </div>
                                              )}
                                              {!autoApplyEnabled && !directApplyEnabled && reviewRun && (
                                                <div className="border-t pt-3 mt-4">
                                                  <div className="flex gap-2">
                                                    <Button
                                                      size="sm"
                                                      className="flex-1 text-xs h-8 bg-[#7C3AED] hover:bg-[#6D28D9]"
                                                      onClick={() => handleAcceptFlag(selectedChildItem.title)}
                                                      disabled={acceptedFlags.includes(selectedChildItem.title)}
                                                    >
                                                      {acceptedFlags.includes(selectedChildItem.title) ? "Accepted" : "Accept change"}
                                                    </Button>
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      className="flex-1 text-xs h-8 border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white"
                                                      onClick={() => handlePreviewFlag(selectedChildItem.title)}
                                                      disabled={previewedFlags.includes(selectedChildItem.title) || acceptedFlags.includes(selectedChildItem.title)}
                                                    >
                                                      {previewedFlags.includes(selectedChildItem.title) ? "Showing in doc" : "Show in track changes"}
                                                    </Button>
                                                  </div>
                                                </div>
                                              )}
                                            </>
                                          ) : (
                                            <>
                                              <p className="text-sm text-gray-700 italic mb-3">
                                                {content.suggested}
                                              </p>
                                              <div className="border-t pt-3">
                                                <p className="text-xs font-medium text-[#7C3AED] mb-1">Why this helps:</p>
                                                <p className="text-xs text-gray-600">
                                                  {content.why}
                                                </p>
                                              </div>
                                              {directApplyEnabled && reviewRun && (
                                                <div className="border-t pt-3 mt-3">
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-xs h-7 px-3 border-gray-300 text-gray-600 hover:bg-gray-50"
                                                    onClick={() => handleUndoDirectApplication(selectedChildItem.title)}
                                                  >
                                                    Undo
                                                  </Button>
                                                </div>
                                              )}
                                              {!autoApplyEnabled && !directApplyEnabled && reviewRun && (
                                                <div className="border-t pt-3 mt-3">
                                                  <div className="flex gap-2">
                                                    <Button
                                                      size="sm"
                                                      className="flex-1 text-xs h-8 bg-[#7C3AED] hover:bg-[#6D28D9]"
                                                      onClick={() => handleAcceptFlag(selectedChildItem.title)}
                                                      disabled={acceptedFlags.includes(selectedChildItem.title)}
                                                    >
                                                      {acceptedFlags.includes(selectedChildItem.title) ? "Accepted" : "Accept change"}
                                                    </Button>
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      className="flex-1 text-xs h-8 border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white"
                                                      onClick={() => handlePreviewFlag(selectedChildItem.title)}
                                                      disabled={previewedFlags.includes(selectedChildItem.title) || acceptedFlags.includes(selectedChildItem.title)}
                                                    >
                                                      {previewedFlags.includes(selectedChildItem.title) ? "Showing in doc" : "Show in track changes"}
                                                    </Button>
                                                  </div>
                                                </div>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      </TabsContent>
                                    </Tabs>
                                  </div>
                                </div>
                              </div>
                            )
                          }

                          // Regular AI messages (existing functionality)
                          return (
                            <div
                              key={message.id}
                              className="flex flex-col gap-3"
                              data-testid={`risk-ai-message-${message.id}`}
                            >
                              <div className="flex items-end gap-2">
                                <div className="w-8 h-8 rounded-full bg-purple-100 flex-shrink-0 overflow-hidden">
                                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" fill="#7C3AED" />
                                  </svg>
                                </div>
                                <div className="rounded-2xl bg-gray-100 px-4 py-2 max-w-[80%]">
                                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{message.content}</p>
                                </div>
                              </div>
                            </div>
                          )
                        }
                      })}
                    </>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              <div className="border-t border-gray-200 p-4" data-testid="chat-input-container">
                {/* Show the configuration form when we're in a review chat and haven't submitted the form yet */}
                {activeChat?.title &&
                (activeChat.title === "Run AI Review" || activeChat.title === "Re-Run Review") &&
                activeChat.messages.length <= 2 ? (
                  // Show the configuration form instead of the chat input
                  <ReviewConfigForm
                    onSubmit={(values) => {
                      // Add the form submission as a user message
                      setActiveChat((prev) => {
                        if (!prev) return null
                        return {
                          ...prev,
                          messages: [
                            ...prev.messages,
                            {
                              id: Date.now().toString(),
                              type: "user",
                              content: `Document type: ${values.documentType}\nGoverning law: ${values.governingLaw}\nParty: ${values.party}`,
                            },
                            {
                              id: (Date.now() + 1).toString(),
                              type: "ai",
                              content:
                                "Please give Genie as much information as possible to help tailor your review.\n\nThe more you write, the better your review will be.\n\nFor example:\nBackground on your business and the other party\nAny key concerns or risks\nYour top priorities for handling this contract",
                            },
                          ],
                        }
                      })
                    }}
                  />
                ) : (
                  // Show the regular chat input
                  <div className="relative">
                    <textarea
                      placeholder="Message Genie"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                      className="min-h-[60px] w-full resize-none rounded-lg border border-gray-300 p-3 pr-12 focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
                      data-testid="chat-input"
                      disabled={isProcessingReview}
                    />
                    <Button
                      size="icon"
                      className="absolute bottom-2 right-2 h-8 w-8 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9]"
                      onClick={() => handleSendMessage()}
                      data-testid="send-message-button"
                      disabled={isProcessingReview || !prompt.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {selectedChildItem && !activeChat && (
            <motion.div
              key={selectedChildItem.title}
              className="flex h-full flex-col"
              data-testid="risk-chat-container"
              variants={chatAnimationVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="border-b border-gray-200 p-4" data-testid="risk-chat-header">
                <div className="flex items-center gap-2 mb-3">
                  <button className="p-1 text-gray-500 hover:text-gray-700" onClick={closeChildItemChat}>
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div
                    className={`h-2 w-2 rounded-full flex-shrink-0 ${
                      selectedChildItem.severity === "High" ? "bg-red-500" : "bg-yellow-400"
                    }`}
                    data-testid="risk-severity-indicator"
                  />
                  <h2 className="font-medium text-gray-900 flex-1">{selectedChildItem.title}</h2>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs px-3"
                    onClick={() =>
                      selectedChildItem &&
                      (resolvedItems.includes(selectedChildItem.title)
                        ? setResolvedItems((prev) => prev.filter((item) => item !== selectedChildItem.title))
                        : markItemAsResolved(selectedChildItem.title))
                    }
                    data-testid="mark-resolved-button"
                  >
                    {resolvedItems.includes(selectedChildItem.title) ? "Move to Review" : "Mark as Reviewed"}
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 p-4" data-testid="risk-chat-messages-area">
                <div className="flex flex-col justify-end min-h-full space-y-4">
                  {/* Chat messages for this specific child item */}
                  {(childItemMessages[selectedChildItem.title] || []).map((message) => {
                    if (message.type === "user") {
                      return (
                        <div
                          key={message.id}
                          className="flex justify-end"
                          data-testid={`risk-user-message-${message.id}`}
                        >
                          <div className="flex items-end gap-2">
                            <div className="rounded-2xl bg-[#7C3AED] px-4 py-2 text-white max-w-[80%]">
                              <p className="text-sm">{message.content}</p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex-shrink-0 overflow-hidden">
                              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path
                                  d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21"
                                  stroke="#7C3AED"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </div>
                          </div>
                        </div>
                      )
                    }

                    if (message.type === "ai") {
                      // Handle structured risk content
                      if (message.content === "structured-risk-content") {
                        return (
                          <div
                            key={message.id}
                            className="flex flex-col gap-3"
                            data-testid={`risk-ai-message-${message.id}`}
                          >
                            <div className="flex items-start gap-2">
                              <div className="w-8 h-8 rounded-full bg-purple-100 flex-shrink-0 overflow-hidden mt-1">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <circle cx="12" cy="12" r="10" fill="#7C3AED" />
                                </svg>
                              </div>
                              <div className="flex-1 bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h3 className="font-medium text-gray-900">
                                    Loophole: Unverified Prior Knowledge Claim
                                  </h3>
                                  <ChevronUp className="h-4 w-4 text-gray-400" />
                                </div>

                                <p className="text-sm text-gray-700 mb-4">
                                  Certain exclusions allow the Receiving Party to claim they already knew information
                                  without any proof, creating a potential loophole for misuse.
                                </p>

                                <Tabs defaultValue="suggested" className="w-full">
                                  <TabsList className="grid w-full grid-cols-2 bg-white">
                                    <TabsTrigger value="original" className="text-sm">
                                      Original
                                    </TabsTrigger>
                                    <TabsTrigger value="suggested" className="text-sm">
                                      {directApplyEnabled ? "New wording" : "Suggested"}
                                    </TabsTrigger>
                                  </TabsList>

                                  <TabsContent value="original" className="mt-3">
                                    <div className="bg-white rounded-md p-3 border">
                                      <p className="text-sm text-gray-700 italic">
                                        "...information that is already known to the Receiving Party..."
                                      </p>
                                    </div>
                                  </TabsContent>

                                  <TabsContent value="suggested" className="mt-3">
                                    <div className="bg-white rounded-md p-3 border">
                                      <p className="text-sm text-gray-700 italic mb-3">
                                        "...information that is already known to the Receiving Party, as evidenced by
                                        written records created prior to disclosure."
                                      </p>

                                      <div className="border-t pt-3">
                                        <p className="text-xs font-medium text-[#7C3AED] mb-1">Why this helps:</p>
                                        <p className="text-xs text-gray-600">
                                          Adds a documentation requirement, preventing false retrospective claims and
                                          preserving the NDA's enforceability.
                                        </p>
                                      </div>
                                      {directApplyEnabled && reviewRun && (
                                        <div className="border-t pt-3 mt-3">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-xs h-7 px-3 border-gray-300 text-gray-600 hover:bg-gray-50"
                                            onClick={() => handleUndoDirectApplication("Loophole: Unverified Prior Knowledge Claim")}
                                          >
                                            Undo
                                          </Button>
                                        </div>
                                      )}
                                      {!autoApplyEnabled && !directApplyEnabled && reviewRun && (
                                        <div className="border-t pt-3 mt-3">
                                          <div className="flex gap-2">
                                            <Button
                                              size="sm"
                                              className="flex-1 text-xs h-8 bg-[#7C3AED] hover:bg-[#6D28D9]"
                                              onClick={() => handleAcceptFlag("Loophole: Unverified Prior Knowledge Claim")}
                                              disabled={acceptedFlags.includes("Loophole: Unverified Prior Knowledge Claim")}
                                            >
                                              {acceptedFlags.includes("Loophole: Unverified Prior Knowledge Claim") ? "Accepted" : "Accept change"}
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="flex-1 text-xs h-8 border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white"
                                              onClick={() => handlePreviewFlag("Loophole: Unverified Prior Knowledge Claim")}
                                              disabled={previewedFlags.includes("Loophole: Unverified Prior Knowledge Claim") || acceptedFlags.includes("Loophole: Unverified Prior Knowledge Claim")}
                                            >
                                              {previewedFlags.includes("Loophole: Unverified Prior Knowledge Claim") ? "Showing in doc" : "Show in track changes"}
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </TabsContent>
                                </Tabs>
                              </div>
                            </div>
                          </div>
                        )
                      }

                      // Handle placeholder structured content for other risk flags
                      if (message.content === "structured-risk-content-placeholder") {
                        const getContentForItem = (title: string) => {
                          switch (title) {
                            case "Premature Exit: Unilateral Early Termination":
                              return {
                                description: "Allowing either party to terminate at will undermines the confidentiality period and could expose the Disclosing Party to post-termination misuse.",
                                original: "\"…unless terminated earlier by either party with 30 days' notice.\"",
                                suggested: "\"…unless terminated earlier by mutual written agreement or by the Disclosing Party with 30 days' notice.\"",
                                why: "Prevents the Receiving Party from exiting unilaterally while still in possession of sensitive information, giving the Disclosing Party more control."
                              }
                            case "Untrackable Oral Disclosures":
                              return {
                                description: "The agreement treats oral and written disclosures equally but provides no way to verify oral information was actually disclosed, making enforcement difficult.",
                                original: "\"…whether oral or written…\"",
                                suggested: "\"…whether oral or written, provided that oral disclosures are confirmed in writing and marked as confidential within 15 days.\"",
                                why: "Introduces a record-keeping requirement that strengthens evidentiary support for oral disclosures."
                              }
                            case "Vague Deadline: Unclear Return Timeline":
                              return {
                                description: "\"Reasonable period\" is subjective and could delay the return or destruction of sensitive materials.",
                                original: "\"…shall return or destroy all Confidential Information within a reasonable period.\"",
                                suggested: "\"…shall return or destroy all Confidential Information within 10 business days of termination of this Agreement.\"",
                                why: "Creates a clear, enforceable timeline, helping avoid disputes and delays."
                              }
                            case "Jurisdiction Gap: No Legal Venue Set":
                              return {
                                description: "The remedies clause allows for injunctive relief but does not specify the legal jurisdiction, opening the door to venue disputes.",
                                original: "\"The Disclosing Party is entitled to seek injunctive relief…\"",
                                suggested: "\"The Disclosing Party is entitled to seek injunctive relief in the courts of England and Wales [or relevant jurisdiction]…\"",
                                why: "Establishes where legal disputes will be resolved, ensuring smoother enforcement."
                              }
                            case "Incomplete Confidentiality Lifecycle Controls":
                              return {
                                description: "The NDA contains several strong protections for confidential information, but it still lacks unified lifecycle management. There's no explicit link between how confidential information is defined, handled during the agreement, and controlled after termination—leaving the contract potentially vulnerable to misinterpretation or non-compliance.",
                                original: "**Clause 2 – Obligations of Confidentiality**\n\"The Receiving Party agrees not to disclose, copy, or use the Confidential Information for any purpose other than evaluating a potential business relationship.\"\n\n**Clause 4 – Term**\n\"This Agreement shall remain in effect for two (2) years from the Effective Date, unless terminated earlier by either party with 30 days' notice.\"\n\n**Clause 5 – Return or Destruction**\n\"Upon termination, the Receiving Party shall return or destroy all Confidential Information within a reasonable period.\"\n\n**No additional lifecycle coordination clause currently exists.**",
                                suggested: "**Clause 2 – Obligations of Confidentiality**\nAdd: \"The Receiving Party shall implement reasonable administrative, technical, and physical safeguards to protect Confidential Information from unauthorized use or disclosure.\"\n\n**Clause 4 – Term**\nAdd: \"Notwithstanding any termination of this Agreement, the confidentiality obligations in Clause 2 shall survive for five (5) years from the date of disclosure of the relevant Confidential Information.\"\n\n**Clause 5 – Return or Destruction**\nAdd: \"The Receiving Party shall certify such destruction in writing. Backups containing Confidential Information shall also be deleted where feasible.\"\n\n**New Clause – Lifecycle of Confidential Information**\n\"The Parties agree that confidentiality obligations should be interpreted consistently across the Agreement, including identification, protection, and return of Confidential Information. In the event of ambiguity or conflict between clauses, the interpretation that provides the highest level of protection to the Disclosing Party shall apply.\"",
                                why: "These edits close lifecycle gaps by aligning definition, handling, post-termination obligations, and enforcement of confidentiality duties. They prevent information from falling through procedural cracks and reduce risk exposure by coordinating obligations across multiple clauses."
                              }
                            default:
                              return {
                                description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
                                original: "\"Lorem ipsum dolor sit amet, consectetur adipiscing elit...\"",
                                suggested: "\"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\"",
                                why: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
                              }
                          }
                        }

                        const content = getContentForItem(selectedChildItem?.title || "")

                        return (
                          <div
                            key={message.id}
                            className="flex flex-col gap-3"
                            data-testid={`risk-ai-message-${message.id}`}
                          >
                            <div className="flex items-start gap-2">
                              <div className="w-8 h-8 rounded-full bg-purple-100 flex-shrink-0 overflow-hidden mt-1">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <circle cx="12" cy="12" r="10" fill="#7C3AED" />
                                </svg>
                              </div>
                              <div className="flex-1 bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h3 className="font-medium text-gray-900">{selectedChildItem?.title}</h3>
                                  <ChevronUp className="h-4 w-4 text-gray-400" />
                                </div>

                                <p className="text-sm text-gray-700 mb-4">
                                  {content.description}
                                </p>

                                <Tabs defaultValue="suggested" className="w-full">
                                  <TabsList className="grid w-full grid-cols-2 bg-white">
                                    <TabsTrigger value="original" className="text-sm">
                                      Original
                                    </TabsTrigger>
                                    <TabsTrigger value="suggested" className="text-sm">
                                      {directApplyEnabled ? "New wording" : "Suggested"}
                                    </TabsTrigger>
                                  </TabsList>

                                  <TabsContent value="original" className="mt-3">
                                    <div className="bg-white rounded-md p-3 border">
                                      {selectedChildItem?.title === "Incomplete Confidentiality Lifecycle Controls" ? (
                                        formatLifecycleContent(content.original)
                                      ) : (
                                        <p className="text-sm text-gray-700 italic">
                                          {content.original}
                                        </p>
                                      )}
                                    </div>
                                  </TabsContent>

                                  <TabsContent value="suggested" className="mt-3">
                                    <div className="bg-white rounded-md p-3 border">
                                      {selectedChildItem?.title === "Incomplete Confidentiality Lifecycle Controls" ? (
                                        <>
                                          {formatLifecycleContent(content.suggested)}
                                          <div className="border-t pt-3 mt-4">
                                            <p className="text-xs font-medium text-[#7C3AED] mb-1">Why this helps:</p>
                                            <p className="text-xs text-gray-600">
                                              {content.why}
                                            </p>
                                          </div>
                                          {directApplyEnabled && reviewRun && (
                                            <div className="border-t pt-3 mt-4">
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-xs h-7 px-3 border-gray-300 text-gray-600 hover:bg-gray-50"
                                                onClick={() => handleUndoDirectApplication(selectedChildItem.title)}
                                              >
                                                Undo
                                              </Button>
                                            </div>
                                          )}
                                          {!autoApplyEnabled && !directApplyEnabled && reviewRun && (
                                            <div className="border-t pt-3 mt-4">
                                              <div className="flex gap-2">
                                                <Button
                                                  size="sm"
                                                  className="flex-1 text-xs h-8 bg-[#7C3AED] hover:bg-[#6D28D9]"
                                                  onClick={() => handleAcceptFlag(selectedChildItem.title)}
                                                  disabled={acceptedFlags.includes(selectedChildItem.title)}
                                                >
                                                  {acceptedFlags.includes(selectedChildItem.title) ? "Accepted" : "Accept change"}
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="flex-1 text-xs h-8 border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white"
                                                  onClick={() => handlePreviewFlag(selectedChildItem.title)}
                                                  disabled={previewedFlags.includes(selectedChildItem.title) || acceptedFlags.includes(selectedChildItem.title)}
                                                >
                                                  {previewedFlags.includes(selectedChildItem.title) ? "Showing in doc" : "Show in track changes"}
                                                </Button>
                                              </div>
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <>
                                          <p className="text-sm text-gray-700 italic mb-3">
                                            {content.suggested}
                                          </p>
                                          <div className="border-t pt-3">
                                            <p className="text-xs font-medium text-[#7C3AED] mb-1">Why this helps:</p>
                                            <p className="text-xs text-gray-600">
                                              {content.why}
                                            </p>
                                          </div>
                                          {directApplyEnabled && reviewRun && (
                                            <div className="border-t pt-3 mt-3">
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-xs h-7 px-3 border-gray-300 text-gray-600 hover:bg-gray-50"
                                                onClick={() => handleUndoDirectApplication(selectedChildItem.title)}
                                              >
                                                Undo
                                              </Button>
                                            </div>
                                          )}
                                          {!autoApplyEnabled && !directApplyEnabled && reviewRun && (
                                            <div className="border-t pt-3 mt-3">
                                              <div className="flex gap-2">
                                                <Button
                                                  size="sm"
                                                  className="flex-1 text-xs h-8 bg-[#7C3AED] hover:bg-[#6D28D9]"
                                                  onClick={() => handleAcceptFlag(selectedChildItem.title)}
                                                  disabled={acceptedFlags.includes(selectedChildItem.title)}
                                                >
                                                  {acceptedFlags.includes(selectedChildItem.title) ? "Accepted" : "Accept change"}
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="flex-1 text-xs h-8 border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white"
                                                  onClick={() => handlePreviewFlag(selectedChildItem.title)}
                                                  disabled={previewedFlags.includes(selectedChildItem.title) || acceptedFlags.includes(selectedChildItem.title)}
                                                >
                                                  {previewedFlags.includes(selectedChildItem.title) ? "Showing in doc" : "Show in track changes"}
                                                </Button>
                                              </div>
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </TabsContent>
                                </Tabs>
                              </div>
                            </div>
                          </div>
                        )
                      }

                      // Regular AI messages (existing functionality)
                      return (
                        <div
                          key={message.id}
                          className="flex flex-col gap-3"
                          data-testid={`risk-ai-message-${message.id}`}
                        >
                          <div className="flex items-end gap-2">
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex-shrink-0 overflow-hidden">
                              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" fill="#7C3AED" />
                              </svg>
                            </div>
                            <div className="rounded-2xl bg-gray-100 px-4 py-2 max-w-[80%]">
                              <p className="text-sm text-gray-900 whitespace-pre-wrap">{message.content}</p>
                            </div>
                          </div>
                        </div>
                      )
                    }
                  })}
                </div>
              </ScrollArea>

              {/* Edit Navigation Header - only show if there are unaccepted track changes */}
              {selectedChildItem && (autoApplyEnabled || previewedFlags.includes(selectedChildItem.title)) && !acceptedFlags.includes(selectedChildItem.title) && (
                <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
                  {(() => {
                    const changes = getTrackChangesForFlag(selectedChildItem.title)
                    const currentIndex = currentEditIndex[selectedChildItem.title] || 0
                    
                    return (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-600">
                            AI edits from this chat:
                          </span>
                          
                          {changes.length === 1 ? (
                            <span className="text-sm font-medium text-gray-900">1</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  const newIndex = currentIndex > 0 ? currentIndex - 1 : changes.length - 1
                                  navigateToEdit(selectedChildItem.title, newIndex)
                                }}
                                className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
                                disabled={changes.length <= 1}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              
                              <span className="text-sm font-medium text-gray-900 min-w-[40px] text-center">
                                {currentIndex + 1}/{changes.length}
                              </span>
                              
                              <button
                                onClick={() => {
                                  const newIndex = currentIndex < changes.length - 1 ? currentIndex + 1 : 0
                                  navigateToEdit(selectedChildItem.title, newIndex)
                                }}
                                className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
                                disabled={changes.length <= 1}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 px-3 border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => handleRejectAllForFlag(selectedChildItem.title)}
                          >
                            {changes.length === 1 ? "Reject" : "Reject all"}
                          </Button>
                          <Button
                            size="sm"
                            className="text-xs h-7 px-3 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleAcceptAllForFlag(selectedChildItem.title)}
                          >
                            {changes.length === 1 ? "Accept" : "Accept all"}
                          </Button>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              <div className="border-t border-gray-200 p-4" data-testid="risk-chat-input-container">
                <div className="relative">
                  <textarea
                    placeholder="Chat to Genie about this flagged risk"
                    value={childItemPrompt}
                    onChange={(e) => setChildItemPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSendChildItemMessage()
                      }
                    }}
                    className="min-h-[60px] w-full resize-none rounded-lg border border-gray-300 p-3 pr-12 focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
                    data-testid="risk-chat-input"
                  />
                  <Button
                    size="icon"
                    className="absolute bottom-2 right-2 h-8 w-8 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9]"
                    onClick={handleSendChildItemMessage}
                    data-testid="send-risk-message-button"
                    disabled={!childItemPrompt.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Contract Viewer - Right Panel */}
      <div
        className="fixed top-0 bottom-0 right-0 bg-white border-l border-gray-200 overflow-auto h-screen"
        style={{
          left: showLeftPanel
            ? activeChat || selectedChildItem
              ? "715px"
              : "300px"
            : activeChat || selectedChildItem
              ? "465px"
              : "50px",
          transition: "left 0.3s ease-in-out",
        }}
        data-testid="contract-viewer"
      >
        <div className="overflow-visible">
          <div className="max-w-3xl mx-auto py-8 px-12">
            {/* Title Section */}
            <h1 className="text-3xl font-semibold text-gray-900 mb-8">NDA (Non-Disclosure Agreement)</h1>

            {/* Content Section */}
            <div className="space-y-8 text-gray-700">
              <div ref={partiesRef}>
                <p className="text-base">This Agreement is made between:</p>
                <p className="text-base mt-4">
                  <span className="font-medium">Disclosing Party:</span> [Company A], located at [Address]
                </p>
                <p className="text-base">
                  <span className="font-medium">Receiving Party:</span> [Company B], located at [Address]
                </p>
                <p className="text-base mt-4">
                  <span className="font-medium">Effective Date:</span> [Insert Date]
                </p>
              </div>

              <div ref={backgroundRef} className={shouldHighlightSection("confidentialInfo") ? "border-l-4 border-[#7C3AED] pl-4" : ""}>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Confidential Information</h2>
                <p className="text-base">
                  "Confidential Information" includes all non-public, proprietary, or confidential information, whether oral or written{" "}
                  <TrackChanges 
                    original=""
                    suggested=", provided that oral disclosures are confirmed in writing and marked as confidential within 15 days"
                    flagTitle="Untrackable Oral Disclosures"
                  />
                  , disclosed by the Disclosing Party to the Receiving Party.
                </p>
              </div>

              <div ref={agreedTermsRef} className={shouldHighlightSection("obligations") ? "border-l-4 border-[#7C3AED] pl-4" : ""}>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Obligations of Confidentiality</h2>
                <p className="text-base">
                  The Receiving Party agrees not to disclose, copy, or use the Confidential Information for any purpose
                  other than evaluating a potential business relationship{" "}
                  <TrackChanges 
                    original=""
                    suggested=". The Receiving Party shall implement reasonable administrative, technical, and physical safeguards to protect Confidential Information from unauthorized use or disclosure"
                    flagTitle="Incomplete Confidentiality Lifecycle Controls"
                  />
                  .
                </p>
              </div>

              <div ref={section3Ref} className={shouldHighlightSection("exclusions") ? "border-l-4 border-[#7C3AED] pl-4" : ""}>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Exclusions</h2>
                <p className="text-base">Confidential Information does not include information that is:</p>
                <ul className="list-disc ml-6 mt-2">
                  <li className="text-base">
                    already known to the Receiving Party{" "}
                    <TrackChanges 
                      original=""
                      suggested=", as evidenced by written records created prior to disclosure"
                      flagTitle="Loophole: Unverified Prior Knowledge Claim"
                    />
                    ,
                  </li>
                  <li className="text-base">becomes publicly known without breach,</li>
                  <li className="text-base">is disclosed with prior written consent.</li>
                </ul>
              </div>

              <div ref={termRef} className={shouldHighlightSection("term") ? "border-l-4 border-[#7C3AED] pl-4" : ""}>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Term</h2>
                <p className="text-base">
                  This Agreement shall remain in effect for two (2) years from the Effective Date, unless terminated earlier by{" "}
                  <TrackChanges 
                    original="either party"
                    suggested="mutual written agreement or by the Disclosing Party"
                    flagTitle="Premature Exit: Unilateral Early Termination"
                  />
                  {" "}with 30 days' notice{" "}
                  <TrackChanges 
                    original=""
                    suggested=". Notwithstanding any termination of this Agreement, the confidentiality obligations in Clause 2 shall survive for five (5) years from the date of disclosure of the relevant Confidential Information"
                    flagTitle="Incomplete Confidentiality Lifecycle Controls"
                  />
                  .
                </p>
              </div>

              <div ref={returnDestructionRef} className={shouldHighlightSection("returnDestruction") ? "border-l-4 border-[#7C3AED] pl-4" : ""}>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Return or Destruction</h2>
                <p className="text-base">
                  Upon termination, the Receiving Party shall return or destroy all Confidential Information within{" "}
                  <TrackChanges 
                    original="a reasonable period"
                    suggested="10 business days of termination of this Agreement"
                    flagTitle="Vague Deadline: Unclear Return Timeline"
                  />
                  {" "}
                  <TrackChanges 
                    original=""
                    suggested=". The Receiving Party shall certify such destruction in writing. Backups containing Confidential Information shall also be deleted where feasible"
                    flagTitle="Incomplete Confidentiality Lifecycle Controls"
                  />
                  .
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">No License</h2>
                <p className="text-base">
                  Nothing in this Agreement grants any license or ownership rights under any intellectual property of the Disclosing Party.
                </p>
              </div>

              {(autoApplyEnabled && reviewRun) || (directApplyEnabled && reviewRun) || acceptedFlags.includes("Incomplete Confidentiality Lifecycle Controls") ? (
                <div className={shouldHighlightSection("lifecycle") ? "border-l-4 border-[#7C3AED] pl-4" : ""}>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Lifecycle of Confidential Information</h2>
                  <p className="text-base">
                    <TrackChanges 
                      original=""
                      suggested="The Parties agree that confidentiality obligations should be interpreted consistently across the Agreement, including identification, protection, and return of Confidential Information. In the event of ambiguity or conflict between clauses, the interpretation that provides the highest level of protection to the Disclosing Party shall apply."
                      flagTitle="Incomplete Confidentiality Lifecycle Controls"
                    />
                  </p>
                </div>
              ) : null}

              <div ref={remediesRef} className={shouldHighlightSection("remedies") ? "border-l-4 border-[#7C3AED] pl-4" : ""}>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Remedies</h2>
                <p className="text-base">
                  Any breach may result in irreparable harm. The Disclosing Party is entitled to seek injunctive relief{" "}
                  <TrackChanges 
                    original=""
                    suggested="in the courts of England and Wales [or relevant jurisdiction]"
                    flagTitle="Jurisdiction Gap: No Legal Venue Set"
                  />
                  , in addition to other legal remedies.
                </p>
              </div>

              <div ref={interpretationRef} className="pt-8">
                <p className="text-base">
                  IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.
                </p>

                <div className="grid grid-cols-2 gap-8 mt-8">
                  <div>
                    <p className="text-base font-medium">COMPANY A:</p>
                    <p className="text-base mt-6">By: ________________________</p>
                    <p className="text-base mt-2">Name: _____________________</p>
                    <p className="text-base mt-2">Title: ______________________</p>
                  </div>

                  <div>
                    <p className="text-base font-medium">COMPANY B:</p>
                    <p className="text-base mt-6">By: ________________________</p>
                    <p className="text-base mt-2">Name: _____________________</p>
                    <p className="text-base mt-2">Title: ______________________</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

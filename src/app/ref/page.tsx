"use client"

import { useState, useEffect, useRef } from "react"
import {
  Copy,
  ChevronUp,
  ChevronDown,
  User,
  Check,
  ExternalLink,
  Link2,
  Gift,
  X,
  AlertCircle,
  Calendar,
  DollarSign,
  Activity,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query";
import { getListMembers, getRewards, createReferralWithdraw, getReferralWithdrawHistory } from "@/services/api/RefService";
import { useLang } from "@/lang";
import { toast } from "react-hot-toast";

export default function ReferralPage() {
    const { t } = useLang();
    const { data: rewards = [] } = useQuery({
        queryKey: ["rewards"],
        queryFn: getRewards,
    });

    const { data: listMembers = [] } = useQuery({
        queryKey: ["listMembers"],
        queryFn: getListMembers,
    });

    const { data: withdrawHistory = [], isLoading: isLoadingWithdrawHistory } = useQuery({
        queryKey: ["withdrawHistory"],
        queryFn: getReferralWithdrawHistory,
    });

  const [isTreeVisible, setIsTreeVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [showWithdrawalDetailModal, setShowWithdrawalDetailModal] = useState(false)
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null)
  const [totalEarnings] = useState(typeof rewards.data?.total?.amount_available === 'number' ? rewards.data.total.amount_available : 0)
  const [activeTab, setActiveTab] = useState("users") // 'layers', 'users', 'history'
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedLevel, setSelectedLevel] = useState("all")

  // Transform listMembers data into the format we need
  const transformedMembers = listMembers.data?.members ? Object.entries(listMembers.data.members).flatMap(([level, members]) => {
    const levelNumber = parseInt(level.split('_')[1]);
    return (members as Array<{
        wallet_id: number;
        wallet_solana_address: string;
        wallet_nick_name: string;
        amount_reward: number;
    }>).map((member) => ({
        id: member.wallet_id.toString(),
        name: member.wallet_nick_name || 'Unknown',
        joinDate: new Date().toISOString(), // Since join date is not provided in the API
        earnings: member.amount_reward || 0,
        status: "active", // Since status is not provided in the API
        level: levelNumber,
    }));
  }) : [];

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_API_URL}/?ref=${rewards.data?.referent_code || ''}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWithdraw = async () => {
    if (totalEarnings >= 10) {
      try {
        const response = await createReferralWithdraw();
        if (response.success) {
          toast.success(t('ref.withdrawalSuccess'));
          setShowWithdrawModal(false);
          // Refresh rewards data
          window.location.reload();
        } else {
          toast.error(response.message || 'Withdrawal failed');
        }
      } catch (error: any) {
        console.error('Withdrawal error:', error);
        toast.error(error.response?.data?.message || 'Withdrawal request failed');
      }
    }
  }

  // Format date to display in a more readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  }

  // Format status with color
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: {
        text: t('ref.statusPending'),
        className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      },
      completed: {
        text: t('ref.statusCompleted'),
        className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      },
      rejected: {
        text: t('ref.statusRejected'),
        className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      },
      processing: {
        text: t('ref.statusProcessing'),
        className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {config.text}
      </span>
    );
  };

  // Filter users based on selected level
  const filteredUsers =
    selectedLevel === "all"
      ? transformedMembers
      : transformedMembers.filter((user) => user.level === Number.parseInt(selectedLevel.replace("level", "")))

  // Draw connections between nodes
  const drawConnections = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = "#3b82f6" // blue-500
    ctx.lineWidth = 1.5

    // Level 1 to 2 vertical line
    ctx.beginPath()
    ctx.moveTo(width / 2, 40)
    ctx.lineTo(width / 2, 65)
    ctx.stroke()

    // Level 2 horizontal line
    ctx.beginPath()
    ctx.moveTo(width / 4, 65)
    ctx.lineTo((width / 4) * 3, 65)
    ctx.stroke()

    // Level 2 to 3 vertical lines
    ctx.beginPath()
    ctx.moveTo(width / 4, 65)
    ctx.lineTo(width / 4, 90)
    ctx.moveTo((width / 4) * 3, 65)
    ctx.lineTo((width / 4) * 3, 90)
    ctx.stroke()

    // Level 3 horizontal lines
    ctx.beginPath()
    ctx.moveTo(width / 8, 90)
    ctx.lineTo((width / 8) * 3, 90)
    ctx.moveTo(width / 8, 90)
    ctx.lineTo((width / 8) * 7, 90)
    ctx.stroke()

    // Level 3 to 4 vertical lines
    for (let i = 0; i < 4; i++) {
      const x = (width / 8) * (1 + 2 * i)
      ctx.beginPath()
      ctx.moveTo(x, 90)
      ctx.lineTo(x, 115)
      ctx.stroke()
    }

    // Level 4 horizontal lines
    for (let i = 0; i < 4; i++) {
      const startX = (width / 16) * (1 + 4 * i)
      const endX = (width / 16) * (3 + 4 * i)
      ctx.beginPath()
      ctx.moveTo(startX, 115)
      ctx.lineTo(endX, 115)
      ctx.stroke()
    }

    // Level 4 to 5 vertical lines
    for (let i = 0; i < 8; i++) {
      const x = (width / 16) * (1 + 2 * i)
      ctx.beginPath()
      ctx.moveTo(x, 115)
      ctx.lineTo(x, 140)
      ctx.stroke()
    }

    // Level 5 horizontal lines
    for (let i = 0; i < 8; i++) {
      const startX = (width / 32) * (1 + 4 * i)
      const endX = (width / 32) * (3 + 4 * i)
      ctx.beginPath()
      ctx.moveTo(startX, 140)
      ctx.lineTo(endX, 140)
      ctx.stroke()
    }
  }

  useEffect(() => {
    if (!isTreeVisible) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    const container = canvas.parentElement
    if (!container) return

    canvas.width = container.clientWidth
    canvas.height = 180

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw connections
    drawConnections(ctx, canvas.width, canvas.height)

    // Handle window resize
    const handleResize = () => {
      if (container) {
        canvas.width = container.clientWidth
        canvas.height = 180
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        drawConnections(ctx, canvas.width, canvas.height)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [isTreeVisible])

  // Create a user node component
  const UserNode = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
    const sizeClasses = {
      sm: "w-3 h-3",
      md: "w-5 h-5",
      lg: "w-7 h-7",
    }
    const iconSizes = {
      sm: 6,
      md: 8,
      lg: 12,
    }

    return (
      <div
        className={`${sizeClasses[size]} bg-gradient-to-br from-blue-400 to-blue-600 dark:from-blue-400 dark:to-blue-600 rounded-full flex items-center justify-center shadow-md border border-blue-300/30 dark:border-blue-300/30 hover:scale-110 transition-transform duration-300`}
      >
        <User size={iconSizes[size]} className="text-white" />
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-black dark:to-gray-900 text-gray-900 dark:text-white min-h-screen transition-colors duration-300">
      <style jsx>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #4f46e5 #1f2937;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: linear-gradient(to bottom, #f3f4f6, #e5e7eb);
          border-radius: 10px;
          margin: 4px 0;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #6366f1, #4f46e5);
          border-radius: 10px;
          border: 1px solid #d1d5db;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #7c3aed, #6366f1);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:active {
          background: linear-gradient(to bottom, #8b5cf6, #7c3aed);
        }
        
        .custom-scrollbar::-webkit-scrollbar-corner {
          background: #f3f4f6;
        }

        /* Dark mode scrollbar */
        .dark .custom-scrollbar::-webkit-scrollbar-track {
          background: linear-gradient(to bottom, #1f2937, #111827);
        }
        
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          border: 1px solid #374151;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }
        
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }
        
        .dark .custom-scrollbar::-webkit-scrollbar-corner {
          background: #1f2937;
        }
      `}</style>

      <div className="max-w-4xl mx-auto p-3">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600 dark:from-purple-600 dark:via-purple-700 dark:to-indigo-700 p-3 rounded-md shadow-lg border border-purple-400/30 dark:border-purple-500/20 mb-4">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              {t('ref.title')}
            </h1>
            <div className="w-10 h-1 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full"></div>
          </div>
        </div>

        {/* Referral Link Section */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-md p-3 border border-gray-300/50 dark:border-gray-700/50 shadow-md mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <ExternalLink size={14} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-blue-600 dark:text-blue-400">{t('ref.yourReferralLink')}</h2>
          </div>

          <div className="flex items-center bg-gray-100/80 dark:bg-gray-900/80 rounded-md p-2 border border-gray-300/50 dark:border-gray-700/50 hover:border-blue-400/50 dark:hover:border-blue-500/50 transition-all duration-300 mb-3">
            <span className="flex-1 text-gray-900 dark:text-white font-mono text-xs">{process.env.NEXT_PUBLIC_API_URL}/?ref={rewards.data?.referent_code || ''}</span>
            <button
              onClick={copyToClipboard}
              className="ml-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-2 py-1 rounded-md transition-all duration-300 flex items-center gap-1 shadow-md hover:shadow-lg text-xs"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              <span className="hidden sm:inline">{copied ? t('ref.copied') : t('ref.copy')}</span>
            </button>
          </div>

          {/* <div className="bg-gradient-to-r from-blue-100/50 to-purple-100/50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-md p-2 border border-blue-300/30 dark:border-blue-700/30">
            <h3 className="text-blue-600 dark:text-blue-400 font-semibold mb-1 text-xs">{t('ref.earlyAccessReferral')}</h3>
            <p className="text-gray-600 dark:text-gray-300 text-xs">
              {t('ref.earlyAccessDescription')}
            </p>
          </div> */}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-green-100/60 dark:bg-green-900/40 backdrop-blur-sm rounded-md p-3 border border-green-300/50 dark:border-green-700/50 shadow-md">
            <h3 className="text-green-600 dark:text-green-400 font-semibold mb-1 text-xs">{t('ref.totalReferrals')}</h3>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{rewards.data?.total?.member_num || 0}</p>
          </div>
          <div className="bg-blue-100/60 dark:bg-blue-900/40 backdrop-blur-sm rounded-md p-3 border border-blue-300/50 dark:border-blue-700/50 shadow-md">
            <h3 className="text-blue-600 dark:text-blue-400 font-semibold mb-1 text-xs">{t('ref.totalEarnings')}</h3>
            <div className="flex items-center justify-between">
              <p className="text-xl font-bold text-gray-900 dark:text-white">${typeof rewards.data?.total?.amount_available === 'number' ? rewards.data.total.amount_available.toFixed(5) : '0.00'}</p>
              <button
                onClick={() => setShowWithdrawModal(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-2 py-1 rounded-md transition-all duration-300 flex items-center gap-1 shadow-md hover:shadow-lg text-xs font-medium"
              >
                <Gift size={12} />
                <span className="hidden sm:inline">{t('ref.withdraw')}</span>
              </button>
            </div>
          </div>
          <div className="bg-purple-100/60 dark:bg-purple-900/40 backdrop-blur-sm rounded-md p-3 border border-purple-300/50 dark:border-purple-700/50 shadow-md">
            <h3 className="text-purple-600 dark:text-purple-400 font-semibold mb-1 text-xs">{t('ref.activeReferrals')}</h3>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {rewards.data?.total?.member_num || 0}
            </p>
          </div>
        </div>
        {/* Withdrawal History Section */}
        <div className="bg-white/80 dark:bg-gray-800/60 backdrop-blur-sm rounded-md p-3 border border-gray-300/50 dark:border-gray-700/50 shadow-md mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Activity size={14} className="text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-bold text-blue-600 dark:text-blue-400">{t('ref.withdrawalHistory')}</h2>
            </div>
            {withdrawHistory.data && withdrawHistory.data.length > 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {withdrawHistory.data.length} {withdrawHistory.data.length === 1 ? 'withdrawal' : 'withdrawals'}
              </div>
            )}
          </div>

          <div className="bg-white/50 dark:bg-gray-900 rounded-md border border-gray-300 dark:border-gray-700 overflow-hidden">
            {/* Table Headers */}
            <div className="grid grid-cols-6 gap-2 p-3 text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
              <div className="px-2 py-1">{t('ref.withdrawalId')}</div>
              <div className="px-2 py-1 text-center hidden sm:block">{t('ref.amountUSD')}</div>
              <div className="px-2 py-1 text-center hidden md:block">{t('ref.amountSOL')}</div>
              <div className="px-2 py-1 text-center">{t('ref.status')}</div>
              <div className="px-2 py-1 text-center hidden lg:block">{t('ref.createdAt')}</div>
              <div className="px-2 py-1 text-center hidden xl:block">{t('ref.processedAt')}</div>
            </div>

            {/* Table Rows */}
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
              <div className="p-3 pt-0">
                <div className="space-y-2">
                  {isLoadingWithdrawHistory ? (
                    <div className="text-center py-6">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Loading...</p>
                    </div>
                  ) : withdrawHistory.data && withdrawHistory.data.length > 0 ? (
                    withdrawHistory.data.map((withdrawal: any) => (
                      <div
                        key={withdrawal.withdrawId}
                        className="grid grid-cols-6 gap-2 items-center bg-gray-100/50 dark:bg-gray-800/50 rounded-md p-2 hover:bg-gray-200/70 dark:hover:bg-gray-800/70 transition-colors duration-200"
                      >
                        <div 
                          className="text-xs font-medium text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          onClick={() => {
                            setSelectedWithdrawal(withdrawal);
                            setShowWithdrawalDetailModal(true);
                          }}
                        >
                          #{withdrawal.withdrawId}
                        </div>
                        <div className="text-center text-xs font-bold text-green-600 dark:text-green-400 hidden sm:block">
                          ${typeof withdrawal.amountUSD === 'number' ? withdrawal.amountUSD.toFixed(2) : '0.00'}
                        </div>
                        <div className="text-center text-xs font-bold text-blue-600 dark:text-blue-400 hidden md:block">
                          {typeof withdrawal.amountSOL === 'number' ? withdrawal.amountSOL.toFixed(4) : '0.0000'} SOL
                        </div>
                        <div className="text-center">
                          {getStatusBadge(withdrawal.status)}
                        </div>
                        <div className="text-center text-xs text-gray-700 dark:text-gray-300 hidden lg:block">
                          {withdrawal.createdAt ? formatDate(withdrawal.createdAt) : '-'}
                        </div>
                        <div className="text-center text-xs text-gray-700 dark:text-gray-300 hidden xl:block">
                          {withdrawal.processedAt ? formatDate(withdrawal.processedAt) : '-'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {t('ref.noWithdrawalHistory')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* MLM Tree Structure */}
        <div className="bg-white/80 dark:bg-gray-800/60 backdrop-blur-sm rounded-md p-3 border border-gray-300/50 dark:border-gray-700/50 shadow-md mb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-blue-600 dark:text-blue-400">{t('ref.referralStructure')}</h2>
            <button
              onClick={() => setIsTreeVisible(!isTreeVisible)}
              className="flex items-center gap-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 dark:from-blue-600 dark:to-purple-600 dark:hover:from-blue-500 dark:hover:to-purple-500 text-white px-2 py-1 rounded-md transition-all duration-300 shadow-md hover:shadow-lg font-medium text-xs"
            >
              {isTreeVisible ? (
                <>
                  {t('ref.hide')} <ChevronUp size={12} />
                </>
              ) : (
                <>
                  {t('ref.show')} <ChevronDown size={12} />
                </>
              )}
            </button>
          </div>

          <div
            className={`transition-all duration-500 ease-in-out overflow-hidden ${
              isTreeVisible ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="relative">
              {/* Canvas for connections */}
              <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full z-0" />

              {/* Level indicators */}
              <div className="absolute left-0 top-6 flex flex-col gap-[25px] z-10">
                <div className="text-green-600 dark:text-green-400 font-mono font-bold text-xs">L1</div>
                <div className="text-green-600 dark:text-green-400 font-mono font-bold text-xs">L2</div>
                <div className="text-green-600 dark:text-green-400 font-mono font-bold text-xs">L3</div>
                <div className="text-green-600 dark:text-green-400 font-mono font-bold text-xs">L4</div>
                <div className="text-green-600 dark:text-green-400 font-mono font-bold text-xs">L5</div>
              </div>

              {/* Percentage indicators */}
              <div className="absolute right-0 top-6 flex flex-col gap-[25px] z-10">
                <div className="text-green-600 dark:text-green-400 font-bold text-sm">25%</div>
                <div className="text-green-600 dark:text-green-400 font-bold text-sm">3.5%</div>
                <div className="text-green-600 dark:text-green-400 font-bold text-sm">3%</div>
                <div className="text-green-600 dark:text-green-400 font-bold text-sm">2%</div>
                <div className="text-green-600 dark:text-green-400 font-bold text-sm">1%</div>
              </div>

              {/* Level 1 - YOU */}
              <div className="flex justify-center mb-4 relative z-10 pt-2">
                <div className="flex flex-col items-center">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-0.5 rounded-full mb-1 font-semibold shadow-md text-xs">
                    YOU
                  </div>
                  <div className="text-[10px] text-blue-600 dark:text-blue-300 mb-1 text-center">
                    25%
                  </div>
                  <UserNode size="lg" />
                </div>
              </div>

              {/* Level 2 */}
              <div className="flex justify-between mb-4 px-10 relative z-10">
                <div className="flex flex-col items-center">
                  <div className="text-[10px] text-blue-600 dark:text-blue-300 mb-1 text-center">
                    3.5%
                  </div>
                  <UserNode size="md" />
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-[10px] text-blue-600 dark:text-blue-300 mb-1 text-center">
                    3.5%
                  </div>
                  <UserNode size="md" />
                </div>
              </div>

              {/* Level 3 */}
              <div className="flex justify-between mb-4 px-4 relative z-10">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className="text-[10px] text-blue-600 dark:text-blue-300 mb-1 text-center">
                      3%
                    </div>
                    <UserNode size="md" />
                  </div>
                ))}
              </div>

              {/* Level 4 */}
              <div className="flex justify-between mb-4 px-2 relative z-10">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className="text-[10px] text-blue-600 dark:text-blue-300 mb-1 text-center">
                      2%
                    </div>
                    <UserNode size="sm" />
                  </div>
                ))}
              </div>

              {/* Level 5 */}
              <div className="flex justify-between relative z-10 pb-2">
                {[...Array(16)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className="text-[10px] text-blue-600 dark:text-blue-300 mb-1">1%</div>
                    <UserNode size="sm" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* YOUR REFERRALS Section */}
        <div className="bg-white/80 dark:bg-gray-800/60 backdrop-blur-sm rounded-md p-3 border border-gray-300/50 dark:border-gray-700/50 shadow-md">
          <div className="flex items-center gap-1.5 mb-3">
            <Link2 size={14} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-blue-600 dark:text-blue-400">{t('ref.yourReferrals')}</h2>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-300 dark:border-gray-700 mb-3">
            <button
              onClick={() => setActiveTab("users")}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === "users"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {t('ref.referredUsers')}
            </button>
            <button
              onClick={() => setActiveTab("layers")}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === "layers"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {t('ref.layersReferral')}
            </button>
          </div>

          {/* 5 LAYERS REFERRAL Tab Content */}
          {activeTab === "layers" && (
            <div className="mb-4">
              <div className="bg-white/50 dark:bg-gray-900 rounded-md p-3 border border-gray-300 dark:border-gray-700">
                {/* Table Headers */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  <div></div>
                  <div className="text-center">
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-md px-2 py-1 border border-gray-300 dark:border-gray-600">
                      <span className="text-blue-600 dark:text-blue-400 font-medium text-[10px]">{t('ref.referralCount')}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-md px-2 py-1 border border-gray-300 dark:border-gray-600">
                      <span className="text-blue-600 dark:text-blue-400 font-medium text-[10px]">{t('ref.claimableVolume')}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-md px-2 py-1 border border-gray-300 dark:border-gray-600">
                      <span className="text-blue-600 dark:text-blue-400 font-medium text-[10px]">{t('ref.lifetimeVolume')}</span>
                    </div>
                  </div>
                </div>

                {/* Table Rows */}
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((layer) => (
                    <div key={layer} className="grid grid-cols-4 gap-2 items-center">
                      <div>
                        <div className="bg-blue-600 dark:bg-blue-500 text-white px-2 py-1 rounded-md text-[10px] font-medium text-center">
                          {t('ref.layersReferral')} {layer}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-md px-2 py-1 border border-gray-300 dark:border-gray-600">
                          <span className="text-gray-900 dark:text-white font-bold text-sm">
                            {rewards.data?.by_level?.[`level_${layer}`]?.member_num || 0}
                          </span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-md px-2 py-1 border border-gray-300 dark:border-gray-600">
                          <span className="text-green-600 dark:text-green-400 font-bold text-sm">
                            ${typeof rewards.data?.by_level?.[`level_${layer}`]?.amount_available === 'number' ? rewards.data.by_level[`level_${layer}`].amount_available.toFixed(5) : '0.00'}
                          </span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-md px-2 py-1 border border-gray-300 dark:border-gray-600">
                          <span className="text-green-600 dark:text-green-400 font-bold text-sm">
                            ${typeof rewards.data?.by_level?.[`level_${layer}`]?.amount_total === 'number' ? rewards.data.by_level[`level_${layer}`].amount_total.toFixed(5) : '0.00'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* REFERRED USERS Tab Content */}
          {activeTab === "users" && (
            <div>
              {/* Level Filter Tabs */}
              <div className="flex flex-wrap gap-1 mb-3 p-2 bg-gray-200/50 dark:bg-gray-800/30 rounded-md border border-gray-300/50 dark:border-gray-600/30">
                <button
                  onClick={() => setSelectedLevel("all")}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                    selectedLevel === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {t('ref.all')}
                </button>
                {[1, 2, 3, 4, 5, 6, 7].map((level) => (
                  <button
                    key={level}
                    onClick={() => setSelectedLevel(`level${level}`)}
                    className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                      selectedLevel === `level${level}`
                        ? "bg-blue-600 text-white"
                        : "bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    {t('ref.level')} {level}
                  </button>
                ))}
              </div>

              <div className="bg-white/50 dark:bg-gray-900 rounded-md border border-gray-300 dark:border-gray-700 overflow-hidden">
                {/* Table Headers - Fixed */}
                <div className="grid grid-cols-4 gap-2 p-3 text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
                  <div className="px-2 py-1">{t('ref.user')}</div>
                  <div className="px-2 py-1 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Calendar size={10} />
                      {t('ref.joinDate')}
                    </div>
                  </div>
                  <div className="px-2 py-1 text-center">{t('ref.level')}</div>
                  <div className="px-2 py-1 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <DollarSign size={10} />
                      {t('ref.earnings')}
                    </div>
                  </div>
                </div>

                {/* Table Rows - Scrollable */}
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                  <div className="p-3 pt-0">
                    <div className="space-y-2">
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map((user) => (
                          <div
                            key={user.id}
                            className="grid grid-cols-4 gap-2 items-center bg-gray-100/50 dark:bg-gray-800/50 rounded-md p-2 hover:bg-gray-200/70 dark:hover:bg-gray-800/70 transition-colors duration-200"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                                <User size={12} className="text-white" />
                              </div>
                              <div>
                                <p className="text-gray-900 dark:text-white text-xs font-medium">{user.name === 'Unknown' ? t('ref.unknown') : user.name}</p>
                                <p className="text-gray-500 dark:text-gray-400 text-[10px]">{t('ref.id')}: {user.id}</p>
                              </div>
                            </div>
                            <div className="text-center text-xs text-gray-700 dark:text-gray-300">
                              {formatDate(user.joinDate)}
                            </div>
                            <div className="text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                                {t('ref.level')} {user.level}
                              </span>
                            </div>
                            <div className="text-center text-xs font-bold text-green-600 dark:text-green-400">
                              ${typeof user.earnings === 'number' ? user.earnings.toFixed(5) : '0.00'}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6">
                          <p className="text-gray-500 dark:text-gray-400 text-sm">
                            {t('ref.noReferredUsers')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-2xl border border-gray-300 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Gift className="text-green-500" size={20} />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('ref.withdraw')}</h3>
              </div>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6">
              <div className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg p-4 border border-blue-300/30 dark:border-blue-700/30 mb-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{t('ref.availableBalance')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">${typeof rewards.data?.total?.amount_available === 'number' ? rewards.data.total.amount_available.toFixed(5) : '0.00'}</p>
                </div>
              </div>

              {rewards.data?.total?.amount_available < 20 ? (
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="text-red-500" size={16} />
                    <p className="text-sm font-semibold text-red-700 dark:text-red-400">{t('ref.minimumWithdrawalRequired')}</p>
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-300">
                    {t('ref.minimumWithdrawalDescription', { amount: typeof rewards.data?.total?.amount_available === 'number' ? rewards.data.total.amount_available : '0.00' })}
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                    {t('ref.requiredMore', { amount: typeof rewards.data?.total?.amount_available === 'number' ? (10 - rewards.data.total.amount_available) : '10.00' })}
                  </p>
                </div>
              ) : (
                <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="text-green-500" size={16} />
                    <p className="text-sm font-semibold text-green-700 dark:text-green-400">{t('ref.readyToWithdraw')}</p>
                  </div>
                  <p className="text-sm text-green-600 dark:text-green-300">
                    {t('ref.readyToWithdrawDescription')}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg transition-all duration-300 font-medium"
              >
                {t('ref.cancel')}
              </button>
              <button
                onClick={handleWithdraw}
                disabled={rewards.data?.total?.amount_available < 10}
                className={`flex-1 px-4 py-2 rounded-lg transition-all duration-300 font-medium flex items-center justify-center gap-2 ${
                  rewards.data?.total?.amount_available >= 10
                    ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl"
                    : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                }`}
              >
                <Gift size={16} />
                {t('ref.withdrawAction')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Detail Modal */}
      {showWithdrawalDetailModal && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-2xl border border-gray-300 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="text-blue-500" size={20} />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {t('ref.withdrawalHistory')} #{selectedWithdrawal.withdrawId}
                </h3>
              </div>
              <button
                onClick={() => setShowWithdrawalDetailModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Amount Information */}
              <div className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg p-4 border border-blue-300/30 dark:border-blue-700/30">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{t('ref.amountUSD')}</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      ${typeof selectedWithdrawal.amountUSD === 'number' ? selectedWithdrawal.amountUSD.toFixed(2) : '0.00'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{t('ref.amountSOL')}</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {typeof selectedWithdrawal.amountSOL === 'number' ? selectedWithdrawal.amountSOL.toFixed(4) : '0.0000'} SOL
                    </p>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="bg-gray-100 dark:bg-gray-900/30 rounded-lg p-4 border border-gray-300/30 dark:border-gray-700/30">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{t('ref.status')}</p>
                <div className="flex justify-center">
                  {getStatusBadge(selectedWithdrawal.status)}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-100 dark:bg-gray-900/30 rounded-lg p-3 border border-gray-300/30 dark:border-gray-700/30">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{t('ref.createdAt')}</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedWithdrawal.createdAt ? formatDate(selectedWithdrawal.createdAt) : '-'}
                  </p>
                </div>
                <div className="bg-gray-100 dark:bg-gray-900/30 rounded-lg p-3 border border-gray-300/30 dark:border-gray-700/30">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{t('ref.processedAt')}</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedWithdrawal.processedAt ? formatDate(selectedWithdrawal.processedAt) : '-'}
                  </p>
                </div>
              </div>

              {/* Reward IDs */}
              {selectedWithdrawal.rewardIds && selectedWithdrawal.rewardIds.length > 0 && (
                <div className="bg-gray-100 dark:bg-gray-900/30 rounded-lg p-4 border border-gray-300/30 dark:border-gray-700/30">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{t('ref.rewardIds')}</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedWithdrawal.rewardIds.map((rewardId: number) => (
                      <span
                        key={rewardId}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                      >
                        #{rewardId}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowWithdrawalDetailModal(false)}
                className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg transition-all duration-300 font-medium"
              >
                {t('ref.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

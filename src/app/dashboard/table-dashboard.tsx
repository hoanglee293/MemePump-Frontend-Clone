"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { useLang } from "@/lang";
import { useRouter } from "next/navigation";
import { Search, Loader2, Copy, Star, BarChart4, ChevronDown, ChevronUp, Pill, Flame } from "lucide-react";
import { useState, useEffect } from "react";
import { SolonaTokenService } from "@/services/api";
import { useDebounce } from "@/hooks/useDebounce";
import { formatNumberWithSuffix, truncateString } from "@/utils/format";
import notify from "@/app/components/notify";
import { useAuth } from "@/hooks/useAuth";
import { TableTokenList } from "@/app/components/trading/TableTokenList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { getListTokenAllCategory, getMyWishlist, getTokenByCategory } from "@/services/api/SolonaTokenService";
import { useQuery } from "@tanstack/react-query";
import { getNewCoins, getTopCoins } from "@/services/api/OnChainService";
import TokenList from "@/app/components/dashboard/TokenListCard";
import { getTokenCategorys } from "@/services/api/TelegramWalletService";
import PumpFun from "../components/pump-fun";
import TokenListCategory from "@/app/components/dashboard/TokenListCategory";
import { useTranslate } from "@/hooks/useTranslate";

interface Token {
  id: number;
  name: string;
  symbol: string;
  address: string;
  decimals: number;
  logo_uri: string;
  logoUrl?: string;
  coingeckoId: string | null;
  tradingviewSymbol: string | null;
  isVerified: boolean;
  marketCap: number;
  market_cap?: number;
  isFavorite?: boolean;
  liquidity: any;
  holder: number;
  price?: number;
  priceChange24h?: number;
  volume24h?: number;
  volume_24h_change_percent?: number;
}

const TranslatedCategory = ({ name }: { name: string }) => {
  const { translatedText } = useTranslate(name);
  return <>{translatedText || name}</>;
};

export default function Trading() {
  const router = useRouter();
  const { t } = useLang();
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 1000);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState(() => {
    // Get active tab from localStorage on initial render
    if (typeof window !== 'undefined') {
      return localStorage.getItem('activeTabOverview') || '2';
    }
    return '2';
  });
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortBy, setSortBy] = useState("volume_24h_change_percent");
  const [sortType, setSortType] = useState("desc");

  const { data: topCoins, isLoading: isLoadingTopCoins } = useQuery({
    queryKey: ["topCoins"],
    queryFn: () => getTopCoins({ offset: 3, limit: 50 }),
    refetchInterval: 30000,
  });

  const { data: newCoins, isLoading: isLoadingNewCoins } = useQuery({
    queryKey: ["newCoins"],
    queryFn: () => getNewCoins({ offset: 3, limit: 50 }),
    refetchInterval: 30000,
  });

  const [tokens, setTokens] = useState<Token[]>([]);
  const { data: myWishlist, refetch: refetchMyWishlist } = useQuery({
    queryKey: ["myWishlist"],
    queryFn: getMyWishlist,
    refetchOnMount: true,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["token-categories"],
    queryFn: getTokenCategorys,
  });


  const [searchResults, setSearchResults] = useState<Token[]>([]);

  const [expandedRows, setExpandedRows] = useState<{ [key: string]: boolean }>({});

  // Update localStorage when activeTab changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeTabOverview', activeTab);
    }
  }, [activeTab]);

  // Update tokens when topCoins or newCoins data changes
  useEffect(() => {
    if (activeTab === '1' && topCoins && topCoins.length > 0) {
      const transformedTokens = topCoins.map((token: any) => ({
        ...token,
        logoUrl: token.logo_url || token.logo_uri || "/placeholder.png"
      }));
      setTokens(transformedTokens);
    } else if (activeTab === '2' && newCoins && newCoins.length > 0) {
      const transformedTokens = newCoins.map((token: any) => ({
        ...token,
        logoUrl: token.logo_url || token.logo_uri || "/placeholder.png"
      }));
      setTokens(transformedTokens);
    } else if (activeTab === '3') {
      // Only set tokens when myWishlist data is available
      if (myWishlist?.tokens) {
        // If myWishlist is empty, set empty array
        if (myWishlist.tokens.length === 0) {
          setTokens([]);
          return;
        }

        // Transform wishlist tokens with complete data
        const transformedTokens = myWishlist.tokens.map((token: any) => {
          // Find complete token data from topCoins or newCoins
          const completeTokenData = topCoins?.find((t: any) => t.address === token.address) ||
            newCoins?.find((t: any) => t.address === token.address);

          return {
            ...completeTokenData, // Use complete data if available
            ...token, // Fallback to wishlist data
            logo_uri: completeTokenData?.logo_uri || token.logo_uri || "/placeholder.png",
            isFavorite: true
          };
        });
        setTokens(transformedTokens);
      }
    }
  }, [topCoins, newCoins, myWishlist, activeTab]);


  // Effect to handle search when debounced value changes
  useEffect(() => {
    const searchData = async () => {
      if (!debouncedSearchQuery.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        setCurrentPage(1);
        setTotalPages(1);
        return;
      }
      setIsSearching(true);
      try {
        const res = await SolonaTokenService.getSearchTokenInfor(
          debouncedSearchQuery,
          currentPage,
          18
        );
        setActiveTab("all");
        setSearchResults(res.tokens || []);
        setTotalPages(Math.ceil(res.total / 18));
      } catch (error) {
        console.error("Error searching tokens:", error);
        setSearchResults([]);
        setTotalPages(1);
      } finally {
        setIsSearching(false);
      }
    };

    searchData();
  }, [debouncedSearchQuery, currentPage]);

  // Use search results if available, otherwise use tokens data
  const displayTokens = debouncedSearchQuery.trim() ? searchResults : tokens;
  const handleCopyAddress = (address: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    notify({ message: t('tableDashboard.toast.addressCopied'), type: 'success' });
  };
  const handleStarClick = (token: Token) => {
    const status = myWishlist?.tokens?.some((t: { address: string }) => t.address === token.address) ? "off" : "on";
    const data = {
      token_address: token.address,
      status: status,
    };
    SolonaTokenService.toggleWishlist(data).then(() => {
      refetchMyWishlist();
      notify({ message: status === "on" ? `${t("tableDashboard.toast.add")} ${t("tableDashboard.toast.wishlist")} ${t("tableDashboard.toast.success")}` : `${t("tableDashboard.toast.remove")} ${t("tableDashboard.toast.wishlist")} ${t("tableDashboard.toast.success")}`, type: 'success' });
    }).catch(() => {
      notify({ message: status === "on" ? `${t("tableDashboard.toast.add")} ${t("tableDashboard.toast.wishlist")} ${t("tableDashboard.toast.failed")}` : `${t("tableDashboard.toast.remove")} ${t("tableDashboard.toast.wishlist")} ${t("tableDashboard.toast.failed")}`, type: 'error' });
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortType(sortType === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortType("desc");
    }
  };

  const toggleRow = (address: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [address]: !prev[address]
    }));
  };

  return (
    <div className="z-20">
      <Card className="mb-6 border-none shadow-none bg-transparent">

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-wrap gap-4 mb-4">
            <button
              className={`rounded-sm text-sm font-medium  flex items-center gap-2  px-3 py-1.5 border-1 z-10 border-solid border-theme-primary-300 cursor-pointer transition-all ${activeTab === '1' ? 'dark:bg-theme-black-100 bg-theme-blue-100 text-neutral-100' : 'border-transparent hover:dark:bg-theme-black-100/50'}`}
              onClick={() => setActiveTab('1')}
            >
              <svg width="20" height="20" viewBox="0 0 25 26" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_5675_7005)"><path d="M19.4015 8.23374C19.1741 8.12861 18.9087 8.14648 18.6984 8.27954C18.4875 8.41401 18.3594 8.64717 18.3594 8.89751V10.1191C18.3594 10.5232 18.0311 10.8516 17.627 10.8516C17.2651 10.8516 16.9589 10.5912 16.8996 10.2372C16.3037 6.54356 13.59 0.5 12.5 0.5C11.41 0.5 8.69629 6.54355 8.10117 10.2329C8.04111 10.5912 7.73496 10.8516 7.37305 10.8516C6.96895 10.8516 6.64062 10.5232 6.64062 10.1191V8.89746C6.64062 8.64712 6.5126 8.41397 6.30161 8.27949C6.09063 8.14644 5.82666 8.12856 5.59854 8.23369C3.10513 9.39673 1.51367 14.465 1.51367 17.4434C1.51367 22.1869 6.03125 25.5 12.5 25.5C18.9688 25.5 23.4863 22.1869 23.4863 17.4434C23.4863 14.465 21.8949 9.39673 19.4015 8.23374Z" fill="url(#paint0_linear_5675_7005)"></path><path d="M16.0529 15.5937C15.9192 15.3777 15.6838 15.2461 15.4299 15.2461H13.8048L13.2105 12.8715C13.1361 12.5739 12.885 12.3543 12.5803 12.3207C12.2692 12.2886 11.9824 12.448 11.845 12.7213L8.91534 18.5807C8.80162 18.8074 8.81378 19.077 8.94752 19.2931C9.08126 19.5091 9.31661 19.6407 9.57052 19.6407H11.1956L11.79 22.0153C11.8643 22.3129 12.1154 22.5325 12.4201 22.5661C12.7335 22.5991 13.021 22.4335 13.1554 22.1655L16.0851 16.3062C16.1988 16.0794 16.1866 15.8098 16.0529 15.5937Z" fill="url(#paint1_linear_5675_7005)"></path></g><defs><linearGradient id="paint0_linear_5675_7005" x1="12.5" y1="25.5" x2="12.5" y2="0.5" gradientUnits="userSpaceOnUse"><stop stop-color="#FD5900"></stop><stop offset="1" stop-color="#FFDE00"></stop></linearGradient><linearGradient id="paint1_linear_5675_7005" x1="12.5002" y1="22.5703" x2="12.5002" y2="12.3166" gradientUnits="userSpaceOnUse"><stop stop-color="#FFE59A"></stop><stop offset="1" stop-color="#FFFFD5"></stop></linearGradient><clipPath id="clip0_5675_7005"><rect width="25" height="25" fill="white" transform="translate(0 0.5)"></rect></clipPath></defs></svg>
              <span className={`${activeTab === '1' ? 'dark:gradient-hover' : ''}`}>{t('tableDashboard.tabs.trending')}</span>
            </button>
            <button
              className={`rounded-sm  text-sm font-medium px-2 py-1 border-1 z-10 border-solid border-theme-primary-300 cursor-pointer transition-all ${activeTab === '2' ? 'dark:bg-theme-black-100 bg-theme-blue-100 text-neutral-100' : 'border-transparent hover:dark:bg-theme-black-100/50'}`}
              onClick={() => setActiveTab('2')}
            >
              <span className={`${activeTab === '2' ? 'dark:gradient-hover flex items-center gap-2' : 'flex items-center gap-2'}`}>{t('tableDashboard.tabs.new')} ( Pumpfun<PumpFun />)</span>
            </button>
            {isAuthenticated && (<button
              className={`rounded-sm flex items-center gap-2 text-sm font-medium px-2 py-1 border-1 z-10 border-solid border-theme-primary-300 cursor-pointer transition-all ${activeTab === '3' ? 'dark:bg-theme-black-100 bg-theme-blue-100 text-neutral-100' : 'border-transparent hover:dark:bg-theme-black-100/50'}`}
              onClick={() => setActiveTab('3')}
            >
              <img src="/star-icon.png" alt="star" className="w-5 h-5" />
              <span className={`${activeTab === '3' ? 'dark:gradient-hover' : ''}`}>{t('tableDashboard.tabs.favorite')}</span>
            </button>)}

            <div className="relative inline-block">
              <button
                className={`rounded-sm text-sm font-medium px-2 py-1 border-1 z-10 border-solid flex items-center gap-2 border-theme-primary-300 cursor-pointer transition-all ${activeTab === '4' ? 'dark:bg-theme-black-100 bg-theme-blue-100 text-neutral-100' : 'border-transparent hover:dark:bg-theme-black-100/50'}`}
                onClick={() => setActiveTab('4')}
              >
                <img src="/category-icon.png" alt="star" className="w-5 h-5" />
                {activeTab === '4' ? (
                  <select
                    className="bg-transparent border-none focus:outline-none cursor-pointer flex flex-col text-neutral-100 dark:gradient-hover"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  >

                    <option value="" className="dark:!text-theme-neutral-100 p-1 !text-theme-neutral-1000 dark:!bg-theme-neutral-1000 flex-1">
                      <img src="/category-icon.png" alt="star" className="w-5 h-5" />
                      {t('tableDashboard.tabs.category')}</option>
                    {categories.map((category: any) => (
                      <option key={category.id} value={category.slug} className="dark:!text-theme-neutral-100 p-1 !text-theme-neutral-1000 dark:!bg-theme-neutral-1000 flex-1">
                        <TranslatedCategory name={category.name} />
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>{t('tableDashboard.tabs.category')}</span>
                  </div>
                )}
              </button>
            </div>
          </div>

          <TabsContent value="1">
            {displayTokens && (
              <CardContent className="w-full p-0">
                {/* Desktop Table View */}
                <div className="hidden md:block">
                  <TableTokenList
                    tokens={displayTokens}
                    onCopyAddress={handleCopyAddress}
                    onStarClick={handleStarClick}
                    isFavoritesTab={false}
                    isLoading={isLoadingTopCoins}
                    sortBy={sortBy}
                    sortType={sortType}
                    onSort={handleSort}
                    enableSort={!debouncedSearchQuery.trim()}
                  />
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {displayTokens.map((token) => {
                    return (
                      <div
                        key={token.address}
                        className="bg-white dark:bg-neutral-900  rounded-lg p-4 border border-gray-200 dark:border-neutral-800"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={token.logoUrl || token.logo_uri || "/token-placeholder.png"}
                              alt={token.symbol}
                              className="w-8 h-8 rounded-full"
                            />
                            <div>
                              <div className="font-medium text-sm">{token.symbol}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 max-w-[10ch] truncate">{token.name}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/trading?address=${token.address}`)}
                              className="bg-gradient-to-t dark:bg-gradient-to-t dark:from-theme-primary-500 dark:to-theme-secondary-400 text-sm linear-gradient-blue text-theme-neutral-100 dark:text-neutral-100 font-medium px-3 md:px-4 py-[6px] rounded-full transition-colors whitespace-nowrap"
                            >
                              {t('trading.trade')}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyAddress(token.address, e);
                              }}
                              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => toggleRow(token.address)}
                              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800"
                            >
                              {expandedRows[token.address] ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex gap-2 items-center">
                            <div className="text-xs text-gray-500 dark:text-gray-400">{t('tableDashboard.mobile.price')}</div>
                            <div className="font-medium text-sm">${formatNumberWithSuffix(token.price || 0)}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-gray-500 dark:text-gray-400">{t('tableDashboard.mobile.24hChange')}</div>
                            <div className={`font-medium text-sm ${(token.volume_24h_change_percent ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {(token.volume_24h_change_percent ?? 0) >= 0 ? '+' : ''}{formatNumberWithSuffix(token.volume_24h_change_percent ?? 0)}%
                            </div>
                          </div>
                        </div>

                        {expandedRows[token.address] && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-neutral-800">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex gap-2 items-center">
                                <div className="text-xs text-gray-500 dark:text-gray-400">{t('tableDashboard.mobile.marketCap')}</div>
                                <div className="font-medium text-sm">${formatNumberWithSuffix(token.market_cap || 0)}</div>
                              </div>
                              <div className="flex gap-2 items-center">
                                <div className="text-xs text-gray-500 dark:text-gray-400">{t('tableDashboard.mobile.holders')}</div>
                                <div className="font-medium text-sm">{formatNumberWithSuffix(token.holder || 0)}</div>
                              </div>
                              <div className="flex gap-2 items-center">
                                <div className="text-xs text-gray-500 dark:text-gray-400">{t('tableDashboard.mobile.address')}</div>
                                <div className="flex items-center gap-1">
                                  <span className="font-medium text-sm">{truncateString(token.address, 6)}</span>
                                  <button
                                    onClick={(e) => handleCopyAddress(token.address, e)}
                                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            )}
          </TabsContent>

          <TabsContent value="2">
            <CardContent className="w-full p-0">
              <TokenList />
            </CardContent>
          </TabsContent>

          <TabsContent value="3">
            {displayTokens && (
              <CardContent className="w-full p-0">
                {/* Desktop Table View */}
                <div className="hidden md:block">
                  <TableTokenList
                    tokens={displayTokens}
                    onCopyAddress={handleCopyAddress}
                    onStarClick={handleStarClick}
                    isFavoritesTab={true}
                    isLoading={false}
                    sortBy={sortBy}
                    sortType={sortType}
                    onSort={handleSort}
                    enableSort={!debouncedSearchQuery.trim()}
                  />
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {displayTokens.map((token) => {
                    return (
                      <div
                        key={token.address}
                        className="bg-white dark:bg-neutral-900 rounded-lg p-4 border border-gray-200 dark:border-neutral-800"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={token.logoUrl || token.logo_uri || "/token-placeholder.png"}
                              alt={token.symbol}
                              className="w-8 h-8 rounded-full"
                            />
                            <div>
                              <div className="font-medium text-sm">{token.symbol}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 max-w-[10ch] truncate">{token.name}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/trading?address=${token.address}`)}
                              className="bg-gradient-to-t dark:bg-gradient-to-t dark:from-theme-primary-500 dark:to-theme-secondary-400 text-sm linear-gradient-blue text-theme-neutral-100 dark:text-neutral-100 font-medium px-3 md:px-4 py-[6px] rounded-full transition-colors whitespace-nowrap"
                            >
                              {t('trading.trade')}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyAddress(token.address, e);
                              }}
                              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => toggleRow(token.address)}
                              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800"
                            >
                              {expandedRows[token.address] ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex gap-2 items-center">
                            <div className="text-xs text-gray-500 dark:text-gray-400">{t('tableDashboard.mobile.price')}</div>
                            <div className="font-medium text-sm">${formatNumberWithSuffix(token.price || 0)}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-gray-500 dark:text-gray-400">{t('tableDashboard.mobile.24hChange')}</div>
                            <div className={`font-medium text-sm ${(token.volume_24h_change_percent ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {(token.volume_24h_change_percent ?? 0) >= 0 ? '+' : ''}{formatNumberWithSuffix(token.volume_24h_change_percent ?? 0)}%
                            </div>
                          </div>
                        </div>

                        {expandedRows[token.address] && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-neutral-800">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex gap-2 items-center">
                                <div className="text-xs text-gray-500 dark:text-gray-400">{t('tableDashboard.mobile.marketCap')}</div>
                                <div className="font-medium text-sm">${formatNumberWithSuffix(token.market_cap || 0)}</div>
                              </div>
                              <div className="flex gap-2 items-center">
                                <div className="text-xs text-gray-500 dark:text-gray-400">{t('tableDashboard.mobile.holders')}</div>
                                <div className="font-medium text-sm">{formatNumberWithSuffix(token.holder || 0)}</div>
                              </div>
                              <div className="flex gap-2 items-center">
                                <div className="text-xs text-gray-500 dark:text-gray-400">{t('tableDashboard.mobile.address')}</div>
                                <div className="flex items-center gap-1">
                                  <span className="font-medium text-sm">{truncateString(token.address, 6)}</span>
                                  <button
                                    onClick={(e) => handleCopyAddress(token.address, e)}
                                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            )}
          </TabsContent>
          <TabsContent value="4">
            <CardContent className="w-full p-0">
              <TokenListCategory category={selectedCategory} />
            </CardContent>
          </TabsContent>

        </Tabs>
        {debouncedSearchQuery.trim() &&
          totalPages > 1 &&
          activeTab === "all" && (
            <div className="flex justify-center mt-6 pb-6">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="px-2 md:px-3 py-1 rounded-md bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {t('tableDashboard.pagination.first')}
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-2 md:px-3 py-1 rounded-md bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {t('tableDashboard.pagination.previous')}
                </button>

                {/* Mobile pagination */}
                <div className="md:hidden flex items-center gap-2">
                  <span className="text-sm">
                    {t('tableDashboard.pagination.page')} {currentPage} {t('tableDashboard.pagination.of')} {totalPages}
                  </span>
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-2 md:px-3 py-1 rounded-md bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {t('tableDashboard.pagination.next')}
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 md:px-3 py-1 rounded-md bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {t('tableDashboard.pagination.last')}
                </button>
              </div>
            </div>
          )}
      </Card>
    </div>
  );
}

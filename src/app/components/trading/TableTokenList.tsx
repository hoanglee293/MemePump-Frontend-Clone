"use client"

import { useLang } from "@/lang";
import { getMyWishlist } from "@/services/api/SolonaTokenService";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/table";
import { formatNumberWithSuffix, truncateString } from "@/utils/format";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TiArrowSortedDown, TiArrowSortedUp } from "react-icons/ti";
import PumpFun from "../pump-fun";

const textTitle = 'dark:text-neutral-200 text-black-300 font-normal text-xs max-h-[38px]'
const textContent = 'dark:text-neutral-100 text-black-300 text-xs normal font-semibold'

interface TableTokenListProps {
  tokens: {
    id: number;
    name: string;
    symbol: string;
    address: string;
    decimals: number;
    logo_uri: string;
    coingeckoId: string | null;
    tradingviewSymbol: string | null;
    isVerified: boolean;
    marketCap: number;
    isFavorite?: boolean;
    liquidity: any;
    holder: number;
    price?: number;
    volume_1h_usd?: number;
    volume_1h_change_percent?: number;
    volume_24h_usd?: number;
    volume_24h_change_percent?: number;
  }[];
  onCopyAddress: (address: string, e: React.MouseEvent) => void;
  onStarClick: (token: any) => void;
  isFavoritesTab?: boolean;
  isLoading?: boolean;
  sortBy?: string;
  sortType?: string;
  onSort?: (field: string) => void;
  enableSort?: boolean;
}

const sortTokens = (tokens: TableTokenListProps['tokens'], sortBy: string, sortType: string) => {
  return [...tokens].sort((a, b) => {
    let valueA = a[sortBy as keyof typeof a];
    let valueB = b[sortBy as keyof typeof b];

    // Handle null/undefined values
    if (valueA === null || valueA === undefined) valueA = 0;
    if (valueB === null || valueB === undefined) valueB = 0;

    // Convert to numbers for numeric comparisons
    if (typeof valueA === 'string') valueA = parseFloat(valueA) || 0;
    if (typeof valueB === 'string') valueB = parseFloat(valueB) || 0;

    if (sortType === 'asc') {
      return valueA > valueB ? 1 : -1;
    } else {
      return valueA < valueB ? 1 : -1;
    }
  });
};

export function TableTokenList({
  tokens,
  onCopyAddress,
  onStarClick,
  isFavoritesTab = false,
  isLoading = false,
  sortBy = 'volume_24h_usd',
  sortType = 'desc',
  onSort,
  enableSort = false
}: TableTokenListProps) {
  const router = useRouter();
  const { t } = useLang();
  const queryClient = useQueryClient();
  const [pendingWishlist, setPendingWishlist] = useState<Record<string, boolean>>({});
  const { data: myWishlist } = useQuery({
    queryKey: ["myWishlist"],
    queryFn: getMyWishlist,
    // refetchOnMount: true,
  });
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const handleStarClick = async (e: React.MouseEvent, token: any) => {
    e.stopPropagation();

    const isInWishlist = myWishlist?.tokens?.some((item: any) => item.address === token.address);
    const isAdding = !isInWishlist;

    // Update UI immediately
    setPendingWishlist(prev => ({
      ...prev,
      [token.address]: isAdding
    }));

    // Update wishlist data immediately
    if (myWishlist) {
      const newTokens = isAdding
        ? [{ address: token.address }, ...myWishlist.tokens]
        : myWishlist.tokens.filter((t: { address: string }) => t.address !== token.address);
      
      queryClient.setQueryData(["myWishlist"], {
        ...myWishlist,
        tokens: newTokens
      });
    }

    // Call API in background
    onStarClick?.({
      ...token,
      status: isAdding ? "on" : "off"
    });

    // Clear pending state after a short delay
    setTimeout(() => {
      setPendingWishlist(prev => {
        const newState = { ...prev };
        delete newState[token.address];
        return newState;
      });
    }, 100);
  };

  const isTokenInWishlist = (address: string) => {
    if (address in pendingWishlist) {
      return pendingWishlist[address];
    }
    return myWishlist?.tokens?.some((t: { address: string }) => t.address === address) ?? false;
  };

  // Sort tokens client-side
  const sortedTokens = enableSort ? sortTokens(tokens, sortBy, sortType) : tokens;

  const renderSortIcon = (field: string) => {
    if (!enableSort) return null;
    return (
      <div className="flex flex-col h-5">
        <TiArrowSortedUp
          className={`${sortBy === field && sortType === "asc" ? "text-blue-500" : "text-muted-foreground"}`}
        />
        <TiArrowSortedDown
          className={`-mt-1.5 ${sortBy === field && sortType === "desc" ? "text-blue-500" : "text-muted-foreground"}`}
        />
      </div>
    );
  };

  return (
    <Card className="border-none dark:shadow-blue-900/5">
      <CardContent className="p-0 relative">
        <div className="overflow-hidden rounded-xl border-1 z-10 border-solid border-y-theme-primary-100 border-x-theme-purple-200">
          <Table className="">
            <TableHeader className="border-b-1 border-b-solid border-b-neutral-400">
              <TableRow className="bg-muted/50 ">
                <TableHead className={`pl-[50px] ${textTitle}`}>{t("trading.token")}</TableHead>
                <TableHead className={`${textTitle}`}>{t("trading.address")}</TableHead>
                <TableHead className={`${textTitle}`}>{t("trading.price")}</TableHead>
                <TableHead
                  className={`${enableSort ? "cursor-pointer hover:bg-muted/80 transition-colors" : ""} ${textTitle}`}
                  onClick={() => enableSort && onSort?.("market_cap")}
                >
                  <div className="flex items-center gap-1">
                    {t("trading.marketCap")}
                    {renderSortIcon("market_cap")}
                  </div>
                </TableHead>
                <TableHead
                  className={`${textTitle} ${enableSort ? "cursor-pointer hover:bg-muted/80 transition-colors" : ""}`}
                  onClick={() => enableSort && onSort?.("liquidity")}
                >
                  <div className="flex items-center gap-1">
                    {t("trading.liquidity")}
                    {renderSortIcon("liquidity")}
                  </div>
                </TableHead>
                <TableHead
                  className={`${textTitle} ${enableSort ? "cursor-pointer hover:bg-muted/80 transition-colors" : ""}`}
                  onClick={() => enableSort && onSort?.("holder")}
                >
                  <div className="flex items-center gap-1">
                    {t("trading.holder")}
                    {renderSortIcon("holder")}
                  </div>
                </TableHead>
                <TableHead
                  className={`${textTitle} ${enableSort ? "cursor-pointer hover:bg-muted/80 transition-colors" : ""}`}
                  onClick={() => enableSort && onSort?.("volume_1h_usd")}
                >
                  <div className="flex items-center gap-1">
                    {t("trading.volume1h")}
                    {renderSortIcon("volume_1h_usd")}
                  </div>
                </TableHead>
                <TableHead
                  className={`${textTitle} ${enableSort ? "cursor-pointer hover:bg-muted/80 transition-colors" : ""}`}
                  onClick={() => enableSort && onSort?.("volume_1h_change_percent")}
                >
                  <div className="flex items-center gap-1">
                    {t("trading.volume1hChange")}
                    {renderSortIcon("volume_1h_change_percent")}
                  </div>
                </TableHead>
                <TableHead
                  className={`${textTitle} ${enableSort ? "cursor-pointer hover:bg-muted/80 transition-colors" : ""}`}
                  onClick={() => enableSort && onSort?.("volume_24h_usd")}
                >
                  <div className="flex items-center gap-1">
                    {t("trading.volume24h")}
                    {renderSortIcon("volume_24h_usd")}
                  </div>
                </TableHead>
                <TableHead
                  className={`${textTitle} ${enableSort ? "cursor-pointer hover:bg-muted/80 transition-colors" : ""}`}
                  onClick={() => enableSort && onSort?.("volume_24h_change_percent")}
                >
                  <div className="flex items-center gap-1">
                    {t("trading.volume24hChange")}
                    {renderSortIcon("volume_24h_change_percent")}
                  </div>
                </TableHead>
                <TableHead className={`${textTitle}`}></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody >
              {isLoading ? (
                <TableRow className="hover:bg-white">
                  <TableCell colSpan={11} className="h-32 hover:bg-neutral-900">
                    <div className="flex justify-center items-center">
                      <Loader2 color="#eab308" className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedTokens.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-32 text-center text-muted-foreground">
                    {t("trading.noTokens")}
                  </TableCell>
                </TableRow>
              ) : (
                sortedTokens.map((token: any, index: any) => (
                  <TableRow
                    key={index}
                    className={`hover:dark:bg-neutral-600 group h-14 hover:bg-theme-blue-300 ease-linear cursor-pointer transition-all duration-300 pl-[14px] group ${index % 2 === 0 ? 'bg-white dark:bg-neutral-900' : 'bg-gray-50 dark:bg-neutral-800'}`}
                    onClick={() =>
                      router.push(`trading?address=${token.address}`)
                    }
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`hover:text-yellow-500 ${isFavoritesTab || isTokenInWishlist(token.address) ? 'text-yellow-500' : ''}`}
                          onClick={(e) => handleStarClick(e, token)}
                        >
                          {isFavoritesTab || isTokenInWishlist(token.address) ?
                            <FontAwesomeIcon icon={['fas', 'star']} /> :
                            <Star className="h-4 w-4" />
                          }
                        </Button>

                        <img
                          src={failedImages[token.address] ? "/logo.png" : (token.logoUrl || token.logo_uri || "/logo.png")}
                          alt="token logo"
                          width={30} height={30}
                          className="rounded-full h-[30px]"
                          onError={(e) => {
                            setFailedImages(prev => ({
                              ...prev,
                              [token.address]: true
                            }));
                            // Force fallback image
                            (e.target as HTMLImageElement).src = "/logo.png";
                          }}
                        />
                        {token?.program?.includes("pumpfun") && (
                          <span className='cursor-pointer' onClick={(e) => {
                            e.stopPropagation();
                            window.open(`https://pump.fun/coin/${token.address}`, '_blank')
                          }}>{(token.market == "pumpfun" || token.program == "pumpfun-amm") && <PumpFun />}</span>
                        )}
                        {token?.program === "orca" && (
                          <img
                            src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE/logo.png"
                            alt="orca logo"
                            width={12}
                            height={12}
                            className="rounded-full"
                          />
                        )}
                        {token?.program?.includes("meteora") && (
                          <img
                            src="https://www.meteora.ag/icons/v2.svg"
                            alt="metora logo"
                            width={12}
                            height={12}
                            className="rounded-full"
                          />
                        )}
                        {token?.program?.includes("raydium") && (
                          <img
                            src="https://raydium.io/favicon.ico"
                            alt="raydium logo"
                            width={12}
                            height={12}
                            className="rounded-full"
                          />
                        )}
                        <div className="flex gap-1 flex-col">
                          <span className="line-clamp-2 text-sm font-semibold dark:text-neutral-100 text-black-300">{token.name}</span>
                          <span className="text-xs uppercase dark:text-neutral-300 text-theme-brown-100">{token.symbol}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`!text-[#ffb300] ${textContent} truncate max-w-[200px]`}>
                          {truncateString(token.address, 12)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCopyAddress(token.address, e);
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className={`${textContent}`}>${formatNumberWithSuffix(token.price || 0)}</TableCell>
                    <TableCell className={`dark:!text-[#53e2ef] !text-[#3985dd] ${textContent}`}>${formatNumberWithSuffix(token.market_cap || 0)}</TableCell>
                    <TableCell className={`!text-[#f472b6] ${textContent}`}>${formatNumberWithSuffix(token.liquidity || 0)}</TableCell>
                    <TableCell className={`${textContent}`}>{formatNumberWithSuffix(token.holder || 0)}</TableCell>
                    <TableCell className={`${textContent}`}>${formatNumberWithSuffix(token.volume_1h_usd || 0)}</TableCell>
                    <TableCell className={token.volume_1h_change_percent >= 0 ? "text-green-500" : "text-red-500"}>
                      {token.volume_1h_change_percent ? `${formatNumberWithSuffix(token.volume_1h_change_percent)}%` : <span style={{ color: '#FFD700' }}>-</span>}
                    </TableCell>
                    <TableCell>${formatNumberWithSuffix(token.volume_24h_usd || 0)}</TableCell>
                    <TableCell className={token.volume_24h_change_percent >= 0 ? "text-green-500" : "text-red-500"}>
                      {token.volume_24h_change_percent ? `${formatNumberWithSuffix(token.volume_24h_change_percent)}%` : <span style={{ color: '#FFD700' }}>-</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex ">
                        <button
                          className="lg:max-w-auto max-w-[120px] relative border-1 border-t-theme-secondary-400 border-r-theme-primary-400 border-l-theme-secondary-400 border-b-theme-primary-400 bg-transparent md:py-1 px-3 md:px-4 lg:px-5 py-[1px] h-[28px] rounded-full text-[11px] md:text-xs transition-all duration-500 group-hover:from-theme-blue-100 group-hover:to-theme-blue-200 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-theme-primary-500/30 active:scale-95 w-full md:w-auto group-hover:border-none"
                        >
                          <span className="relative z-10 group-hover:text-neutral-100 text-theme-secondary-400 dark:text-neutral-100">{t("trading.trade")}</span>
                          <div className="absolute inset-0 rounded-full bg-gradient-to-t from-theme-linear-start to-theme-linear-end opacity-0 group-hover:opacity-100 transition-opacity duration-500 " />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

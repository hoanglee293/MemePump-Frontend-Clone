"use client";

import {
  useState,
  useRef,
  type ChangeEvent,
  type FormEvent,
  useEffect,
} from "react";
import { Upload, X, Undo2, Copy, ArrowRight, AlertCircle, Plus, Minus } from "lucide-react";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getTokenCategorys, createTokenPumpFun, getMyTokens } from "@/services/api/TelegramWalletService";
import React from "react";
import { useRouter } from "next/navigation";
import notify from "@/app/components/notify";
// Removed NotifyProvider import - using Toaster from ClientLayout
import { useLang } from "@/lang/useLang";
import { truncateString } from "@/utils/format";
import { Tooltip } from "@radix-ui/react-tooltip";
import { TooltipContent } from "@/ui/tooltip";
import { getTokenByCategory } from "@/services/api/SolonaTokenService";
import { useTranslate } from "@/hooks/useTranslate";
import { useAuth } from "@/hooks/useAuth";
import ModalSignin from "@/app/components/ModalSignin";
import PhantomWarningModal from "@/app/components/PhantomWarningModal";

type CoinFormData = {
  name: string;
  symbol: string;
  amount: string;
  description: string;
  image: File | null;
  telegram?: string;
  website?: string;
  twitter?: string;
  showName: boolean;
  category: string;
  logo: File | null;
  logoPreview: string | null;
  category_list: string[];
};

type FormErrors = {
  [key in keyof Omit<CoinFormData, "logoPreview">]?: string;
};

type TokenData = {
  address: string;
  created_at: string;
  decimals: number;
  description: string;
  initial_liquidity: string;
  is_verified: boolean;
  logo_url: string;
  metadata_uri: string;
  name: string;
  symbol: string;
  telegram: string;
  token_id: number;
  transaction_hash: string;
  twitter: string;
  updated_at: string;
  website: string;
};

const globalStyles = `
    select option {
        background-color: #000;
        color: white;
    }
    select:focus {
        border-color: rgb(59 130 246 / 0.5);
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }
    select::-webkit-scrollbar {
        width: 8px;
    }
    select::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 4px;
    }
    select::-webkit-scrollbar-thumb {
        background: rgba(59, 130, 246, 0.5);
        border-radius: 4px;
    }
    select::-webkit-scrollbar-thumb:hover {
        background: rgba(59, 130, 246, 0.7);
    }
`;

const TranslatedCategory = ({ name }: { name: string }) => {
  const { translatedText } = useTranslate(name);
  return <>{translatedText || name}</>;
};

export default function CreateCoinForm() {
  // const { translate } = useTranslate();
  const router = useRouter();
  const { t, tArray } = useLang();
  const { isAuthenticated } = useAuth();
  const [isSigninModalOpen, setIsSigninModalOpen] = useState(false);
  const initialFormState: CoinFormData = {
    name: "",
    symbol: "",
    amount: "0",
    category: "",
    description: "",
    telegram: "",
    website: "",
    twitter: "",
    logo: null,
    logoPreview: null,
    category_list: [],
    image: null,
    showName: false,
  };

  const [formData, setFormData] = useState<CoinFormData>(initialFormState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showOtherOption, setShowOtherOption] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [disabledAmount, setDisabledAmount] = useState(true);
  const [activeTab, setActiveTab] = useState("today");
  const { data: categories = [] } = useQuery({
    queryKey: ["token-categories"],
    queryFn: getTokenCategorys,
  });

  const { data: tokenByCategory = [] } = useQuery({
    queryKey: ["token-by-category", formData.category],
    queryFn: () => getTokenByCategory(formData.category_list[0]),
    enabled: !!formData.category,
  });
  console.log("tokenByCategory", tokenByCategory)
  const [searchQuery, setSearchQuery] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [phantomConnected, setPhantomConnected] = useState(false);
  // Filter categories based on search query with debouncing
  const filteredCategories = React.useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.toLowerCase().trim();
    return categories.filter((category: any) =>
      category.name.toLowerCase().includes(query)
    );
  }, [categories, searchQuery]);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = globalStyles;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Reset search query when select closes
  useEffect(() => {
    if (!isSelectOpen) {
      setSearchQuery("");
    }
  }, [isSelectOpen]);

  useEffect(() => {
    // Check Phantom connection status from localStorage
    const isPhantomConnected = localStorage.getItem('phantomConnected') === 'true';
    const phantomKey = localStorage.getItem('phantomPublicKey');
    setPhantomConnected(isPhantomConnected);
}, []);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user types
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    // Remove leading zeros except for decimal numbers (0.xxx)
    const processedValue = value.replace(/^0+(\d)/, '$1').replace(/^0+$/, '0');

    setFormData((prev) => ({ ...prev, amount: processedValue }));

    if (errors.amount) {
      setErrors((prev) => ({ ...prev, amount: undefined }));
    }
  };

  const { data: memeCoins = [], refetch: refetchMemeCoins } = useQuery({
    queryKey: ["my-tokens"],
    queryFn: getMyTokens,
  });
  console.log("memeCoins", memeCoins)
  // Filter memeCoins based on activeTab
  const filteredMemeCoins = React.useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eightDaysAgo = new Date(today);
    eightDaysAgo.setDate(today.getDate() - 8);
    const lastMonth = new Date(today);
    lastMonth.setMonth(today.getMonth() - 1);

    return memeCoins.filter((coin: TokenData) => {
      const coinDate = new Date(coin.created_at);
      switch (activeTab) {
        case "today":
          return coinDate >= today;
        case "last8days":
          return coinDate >= eightDaysAgo;
        case "lastmonth":
          return coinDate >= lastMonth;
        default:
          return true;
      }
    });
  }, [memeCoins, activeTab]);

  const handleCategorySelect = (categoryId: string) => {
    setFormData((prev) => {
      // Ensure categoryId is always a string and normalize existing values
      const normalizedCategoryId = String(categoryId);
      const normalizedCategoryList = prev.category_list.map(id => String(id));
      
      const isSelected = normalizedCategoryList.includes(normalizedCategoryId);
      const newCategoryList = isSelected
        ? normalizedCategoryList.filter(id => id !== normalizedCategoryId)
        : [...normalizedCategoryList, normalizedCategoryId];
      
      // Remove duplicates and ensure all values are strings
      const uniqueCategoryList = [...new Set(newCategoryList)];
      
      const newData = {
        ...prev,
        category_list: uniqueCategoryList
      };
      
      return newData;
    });

    // Clear error when user selects
    if (errors.category_list) {
      setErrors((prev) => ({ ...prev, category_list: undefined }));
    }
  };

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, logo: t("createCoin.form.logo.invalidType") }));
      return;
    }

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        logo: t("createCoin.form.logo.size"),
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        logo: file,
        logoPreview: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);

    if (errors.logo) {
      setErrors((prev) => ({ ...prev, logo: undefined }));
    }
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logo: null,
      logoPreview: null,
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUndo = () => {
    setFormData(initialFormState);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = t("createCoin.form.name.required");
    }

    if (!formData.symbol.trim()) {
      newErrors.symbol = t("createCoin.form.symbol.required");
    } else if (formData.symbol.length > 10) {
      newErrors.symbol = t("createCoin.form.symbol.maxLength");
    }
    console.log("formData.amount", formData.amount)
    if (!formData.amount.trim()) {
      newErrors.amount = t("createCoin.form.amount.required");
    } else if (isNaN(Number(formData.amount)) || Number(formData.amount) < 0) {
      newErrors.amount = t("createCoin.form.amount.invalid");
    }

    if (!formData.logo) {
      newErrors.logo = t("createCoin.form.logo.required");
    }

    // Validate category_list to ensure all values are strings and at least one category is selected
    if (formData.category_list.length === 0) {
      newErrors.category_list = t("createCoin.form.categories.required");
    } else {
      const normalizedCategoryList = formData.category_list.map(id => String(id));
      const uniqueCategoryList = [...new Set(normalizedCategoryList)];
      if (uniqueCategoryList.length !== formData.category_list.length) {
        // Update formData to remove duplicates
        setFormData(prev => ({
          ...prev,
          category_list: uniqueCategoryList
        }));
      }
    }

    // Optional fields validation
    if (formData.website && !formData.website.startsWith("http")) {
      newErrors.website =
        t("createCoin.form.website.invalid");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setShowConfirmModal(false);

    try {
      // Create FormData object to handle file upload
      const formDataToSend = new FormData();

      // Add all form fields to FormData
      formDataToSend.append("name", formData.name);
      formDataToSend.append("symbol", formData.symbol);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("amount", String(formData.amount || 0));
      
      // Add category_list as array - append each category separately
      formData.category_list.forEach((category) => {
        formDataToSend.append("category_list", category);
      });

      // Add optional fields if they exist
      if (formData.telegram) formDataToSend.append("telegram", formData.telegram);
      if (formData.website) formDataToSend.append("website", formData.website);
      if (formData.twitter) formDataToSend.append("twitter", formData.twitter);

      console.log("formDataToSend category_list:", formData.category_list);
      console.log("formDataToSend type:", typeof formDataToSend.get("category_list"));

      // Add logo file if it exists
      if (formData.logo) {
        formDataToSend.append("image", formData.logo);
      }

      const response = await createTokenPumpFun(formDataToSend);

      // Handle success
      if (response) {
        // Show success notification
        notify({
          message: t("createCoin.success"),
          type: "success"
        });
        refetchMemeCoins();
        // Reset form
        setFormData(initialFormState);

      }
    } catch (error: any) {
      console.error("Error creating coin:", error);
      // Show error notification
      notify({
        message: t("createCoin.error"),
        type: "error"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const classInput =
    "w-full h-9 md:h-10 lg:h-11 px-3 md:px-4 lg:px-5 dark:bg-transparent bg-white bg-opacity-60 border rounded-lg md:rounded-xl p-2 md:p-3 lg:p-4 text-neutral-200 focus:outline-none placeholder:text-xs md:placeholder:text-sm lg:placeholder:text-base dark:placeholder:text-neutral-200 placeholder:text-theme-neutral-1000 text-theme-neutral-1000 dark:text-theme-neutral-100 placeholder:font-normal " +
    (errors.name
      ? "border-red-500"
      : "border-t-theme-primary-300 border-l-theme-primary-300 border-b-theme-gradient-linear-start border-r-theme-gradient-linear-start") +
    " text-xs md:text-sm lg:text-base";
  const classLabel = "block text-xs md:text-sm lg:text-base font-normal dark:text-theme-neutral-100 text-theme-neutral-900 mb-1 md:mb-1.5 lg:mb-2";

  const ethereumIcon = (width: number, height: number) => {
    return (
      <img src={"/ethereum.png"} alt="ethereum-icon" width={width} height={height} />
    );
  };
  return (
    <>
                      {/* NotifyProvider removed - using Toaster from ClientLayout */}
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="dark:border-create-coin border-create-coin-light bg-white dark:bg-theme-black-1/3 rounded-xl p-6 max-w-xl w-full mx-4 flex flex-col items-center">
            <div className="flex items-center justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-theme-primary-300" />
            </div>
            <h3 className="text-lg font-semibold text-center mb-2 dark:text-theme-neutral-100 text-theme-neutral-900">
              {t('createCoin.confirmation.title')}
            </h3>
            <span className="text-center">
              {t('createCoin.confirmation.description1')}

              <span className="font-bold">
                &nbsp;{Number(formData.amount) + 0.025} SOL
              </span>
              {t('createCoin.confirmation.description3')}
            </span>
            <span className="text-xs text-theme-primary-300 italic">({t('createCoin.form.amount.label')}: {Number(formData.amount) })</span>
            <div className="flex w-full gap-4 justify-center px-2 mt-4">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="min-w-24 px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors dark:text-theme-neutral-100 text-theme-neutral-900"
              >
                {t('createCoin.confirmation.cancel')}
              </button>
              <button
                onClick={handleConfirmSubmit}
                className="min-w-24 px-4 py-2 rounded-full bg-gradient-to-t from-theme-primary-500 to-theme-secondary-400 text-theme-neutral-100 hover:from-theme-blue-100 hover:to-theme-blue-200 transition-all duration-500"
              >
                {t('createCoin.confirmation.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="container-body px-3 md:px-6 lg:px-[40px] flex flex-col md:flex-row gap-4 md:gap-6 lg:gap-8 py-4 md:py-6 lg:py-[30px] relative mx-auto z-10">
        {/* Main Form */}
        <div className="dark:border-create-coin border-create-coin-light bg-white dark:bg-inherit z-10  w-full md:w-2/3 bg-transparent flex-1 bg-opacity-30 rounded-lg md:rounded-xl p-3 md:p-5 lg:p-[30px] shadow-lg flex flex-col">
          <div className="w-full h-full flex flex-col">
            <div className="text-center text-lg md:text-xl lg:text-2xl font-bold dark:text-theme-neutral-100 text-theme-neutral-900 mb-0 md:mb-2 lg:mb-0 flex items-center justify-center gap-1.5 md:gap-2">
              {ethereumIcon(14, 14)}
              {t('createCoin.title')}
              {ethereumIcon(14, 14)}
            </div>
            <div className="text-center text-xs md:text-sm lg:text-base font-normal dark:text-theme-primary-300 text-theme-neutral-900 mb-4 md:mb-5 lg:mb-6">
              {t('createCoin.subtitle')}
            </div>
            <form
              onSubmit={handleSubmit}
              className="flex-1 flex flex-col justify-between min-h-0"
            >
              <div className="flex flex-col gap-3 md:gap-4 lg:gap-5">
                <div className="flex flex-col md:flex-row justify-between gap-3 md:gap-4 lg:gap-6">
                  {/* Name */}
                  <div className="w-full md:w-1/2">
                    <label htmlFor="name" className={classLabel}>
                      {t('createCoin.form.name.label')} <span className="text-theme-red-200">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder={t('createCoin.form.name.placeholder')}
                      className={classInput}
                    />
                    {errors.name && (
                      <p className="mt-1 text-xs text-red-500">{t('createCoin.form.name.required')}</p>
                    )}
                  </div>

                  {/* Symbol */}
                  <div className="w-full md:w-1/2">
                    <label htmlFor="symbol" className={classLabel}>
                      {t('createCoin.form.symbol.label')} <span className="text-theme-red-200">*</span>
                    </label>
                    <input
                      type="text"
                      id="symbol"
                      name="symbol"
                      value={formData.symbol}
                      onChange={handleInputChange}
                      placeholder={t('createCoin.form.symbol.placeholder')}
                      className={classInput}
                    />
                    {errors.symbol && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.symbol === "Symbol should be 10 characters or less"
                          ? t('createCoin.form.symbol.maxLength')
                          : t('createCoin.form.symbol.required')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col md:flex-row justify-between gap-3 md:gap-4 lg:gap-6">
                  {/* Amount */}
                  <div className="w-full md:w-1/2">
                    <label htmlFor="amount" className={classLabel}>
                      {t('createCoin.form.amount.label')} <span className="text-theme-red-200">*</span>
                    </label>
                    <div>
                      <div className="relative">
                        <input
                          type="text"
                          id="amount"
                          name="amount"
                          value={formData.amount ?? 0}
                          // disabled={disabledAmount}
                          onChange={handleAmountChange}
                          placeholder={t('createCoin.form.amount.placeholder')}
                          className={`${classInput} ${disabledAmount ? "bg-gray-200" : ""}`}
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <span className="dark:text-neutral-200 text-theme-neutral-800 text-sm">(SOL)</span>
                        </div>
                        {formData.amount && (
                          <button
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({ ...prev, amount: "" }))
                            }
                            className="absolute inset-y-0 right-16 flex items-center pr-3 text-neutral-200 hover:text-gray-200"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setDisabledAmount(!disabledAmount)
                          }
                          className="absolute inset-y-0 right-16 flex items-center pr-3 text-theme-neutral-1000 text-xl dark:hover:text-gray-200"
                        >
                        </button>
                      </div>
                      <span className="text-xs text-theme-primary-300 italic">
                        (i) {t('createCoin.form.amount.tooltip')}
                      </span>
                    </div>
                    {errors.amount && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.amount === "Please enter a valid amount"
                          ? t('createCoin.form.amount.invalid')
                          : t('createCoin.form.amount.required')}
                      </p>
                    )}
                  </div>

                  {/* Categories */}
                  <div className="w-full md:w-1/2">
                    <label htmlFor="category" className={classLabel}>
                      {t('createCoin.form.categories.label')} <span className="text-theme-red-200">*</span>
                    </label>
                    <div className="relative">
                      <Select
                        onValueChange={handleCategorySelect}
                        value={formData.category_list[formData.category_list.length - 1] || ""}
                        onOpenChange={setIsSelectOpen}
                      >
                        <SelectTrigger className={`${classInput} ${errors.category_list ? "border-red-500" : ""}`}>
                          <SelectValue placeholder={t('createCoin.form.categories.placeholder')}>
                            {formData.category_list.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {formData.category_list.slice(0, 2).map((categoryId, index) => {
                                  const category = categories.find((c: any) => String(c.id) === String(categoryId));
                                  return category ? (
                                    <span key={categoryId} className="text-sm">
                                      {index > 0 && ", "}
                                      <TranslatedCategory name={category.name} />
                                    </span>
                                  ) : null;
                                })}
                                {formData.category_list.length > 2 && (
                                  <span className="text-sm text-theme-primary-300">
                                    +{formData.category_list.length - 2} more
                                  </span>
                                )}
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent
                          className="bg-white dark:bg-neutral-900  rounded-xl z-10"
                        >
                          <div className="sticky top-0 p-2 bg-white dark:bg-neutral-900 border-b border-neutral-700">
                            <input
                              type="text"
                              placeholder={t('createCoin.form.categories.search')}
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  e.stopPropagation();
                                  setSearchQuery('');
                                }
                              }}
                              onFocus={() => setIsSelectOpen(true)}
                              className="w-full h-10 px-4 bg-transparent bg-opacity-60 border rounded-xl p-3 dark:text-neutral-200 text-theme-neutral-800 focus:outline-none placeholder:text-sm dark:placeholder:text-neutral-200 placeholder:text-theme-neutral-800 placeholder:font-normal"
                            />
                          </div>
                          <div className="max-h-[200px] overflow-y-auto">
                            {filteredCategories.length === 0 ? (
                              <div className="p-2 text-center text-neutral-400 text-sm">
                                {searchQuery.trim() ? t('createCoin.form.categories.noResults') : t('createCoin.form.categories.loading')}
                              </div>
                            ) : (
                              filteredCategories.map((category: any) => {
                                const isSelected = formData.category_list.includes(String(category.id));
                                return (
                                  <SelectItem
                                    key={category.id}
                                    className={`text-gray-700 dark:text-neutral-400 cursor-pointer dark:hover:bg-neutral-800 dark:hover:text-theme-neutral-100 ${
                                      isSelected ? 'bg-blue-100 dark:bg-blue-900' : ''
                                    }`}
                                    value={category.id}
                                  >
                                    <div className="flex items-center gap-2">
                                      {isSelected && (
                                        <span className="text-blue-500">✓</span>
                                      )}
                                      <TranslatedCategory name={category.name} />
                                    </div>
                                  </SelectItem>
                                );
                              })
                            )}
                          </div>
                        </SelectContent>
                      </Select>
                      {errors.category_list && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.category_list}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className={classLabel}>
                    {t('createCoin.form.description.label')}
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder={t('createCoin.form.description.placeholder')}
                    rows={3}
                    className={`${classInput} min-h-[80px] md:min-h-[100px] lg:min-h-[120px]`}
                  />
                  {errors.description && (
                    <p className="mt-1 text-xs text-theme-red-100">
                      {errors.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-col md:flex-row gap-3 md:gap-4 lg:gap-6 w-full">
                  <div className="w-full md:w-1/2">
                    <label className={classLabel}>
                      {t('createCoin.form.logo.label')} <span className="text-theme-red-200">*</span>
                    </label>
                    <div
                      className={`border-2 border-dashed ${errors.logo ? "border-red-500" : "border-blue-500/50"
                        } rounded-lg p-2 md:p-3 lg:p-4 h-[140px] md:h-[180px] lg:h-[200px] flex items-center justify-center cursor-pointer relative overflow-hidden`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleLogoUpload}
                      />

                      {formData.logoPreview ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                          <img
                            src={formData.logoPreview || "/placeholder.svg"}
                            alt="Logo preview"
                            width={150}
                            className="object-contain"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveLogo();
                            }}
                            className="absolute top-0 right-0 bg-red-500 rounded-full p-1 m-1"
                          >
                            <X className="h-4 w-4 dark:text-theme-neutral-100 text-theme-neutral-900" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload className="h-8 w-8 dark:text-theme-neutral-100 text-theme-neutral-900 mx-auto mb-2" />
                          <p className="text-xs dark:text-theme-neutral-100 text-theme-neutral-900 font-normal">
                            {t('createCoin.form.logo.upload')}
                          </p>
                        </div>
                      )}
                    </div>
                    {errors.logo && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.logo === "Please upload an image file"
                          ? t('createCoin.form.logo.invalidType')
                          : errors.logo === "Image size should be less than 2MB"
                            ? t('createCoin.form.logo.maxSize')
                            : t('createCoin.form.logo.required')}
                      </p>
                    )}
                  </div>
                  {/* Preview */}
                  <div className="w-full md:w-1/2 mt-3 md:mt-0">
                    <label className={classLabel}>{t('createCoin.form.preview.label')}</label>
                    <div className="dark:bg-black bg-opacity-60 border border-blue-500/50 rounded-lg p-3 md:p-4 lg:p-6 relative h-[160px] md:h-[180px] lg:h-[200px] flex flex-col justify-center items-center">
                      <div className="flex flex-col items-center gap-1.5 md:gap-2">
                        <div className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 dark:bg-white bg-theme-green-300 rounded-full overflow-hidden mb-1.5 md:mb-2 flex items-center justify-center">
                          {formData.logoPreview ? (
                            <img
                              src={formData.logoPreview}
                              alt="Logo preview"
                              width={64}
                              height={64}
                              className="object-cover"
                            />
                          ) : (
                            <img
                              src={"/user-icon.png"}
                              alt="user-icon"
                              width={40}
                              height={40}
                            />
                          )}
                        </div>
                        <h3 className="dark:text-theme-neutral-100 text-theme-neutral-900 font-semibold text-xs md:text-sm lg:text-base">
                          {formData.name || t('createCoin.form.preview.name')}
                        </h3>
                        <p className="dark:text-theme-neutral-100 text-theme-neutral-900 text-[10px] md:text-xs lg:text-sm font-normal my-1 md:my-1.5 lg:my-2">
                          {formData.symbol || t('createCoin.form.preview.symbol')}
                        </p>
                        <p className="dark:text-theme-neutral-100 text-theme-neutral-900 text-[10px] md:text-xs lg:text-sm font-normal text-center">
                          {formData.description || t('createCoin.form.preview.description')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleUndo}
                        className="absolute top-2 right-2 dark:text-theme-neutral-100 text-theme-neutral-900 hover:text-theme-primary-300 flex items-center gap-2"
                      >
                        <Undo2 className="h-4 w-4" /> {t('createCoin.form.preview.undo')}
                      </button>
                    </div>
                  </div>
                </div>
                <div
                  style={{ marginBottom: "-8px" }}
                  className={`mt-3 md:mt-4 lg:mt-6 cursor-pointer hover:text-theme-primary-300 text-xs md:text-sm lg:text-base ${showOtherOption && "text-theme-primary-300"}`}
                  onClick={() => setShowOtherOption(!showOtherOption)}
                >
                  {t('createCoin.form.otherOptions.title')}
                </div>
                {showOtherOption && (
                  <div className="flex flex-col md:flex-row justify-between gap-3 md:gap-4 lg:gap-6">
                    {/* Telegram */}
                    <div className="w-full md:flex-1">
                      <label htmlFor="telegram" className={classLabel}>
                        {t('createCoin.form.otherOptions.telegram.label')}
                      </label>
                      <input
                        type="text"
                        id="telegram"
                        name="telegram"
                        value={formData.telegram}
                        onChange={handleInputChange}
                        placeholder={t('createCoin.form.otherOptions.telegram.placeholder')}
                        className={classInput}
                      />
                    </div>

                    {/* Twitter */}
                    <div className="w-full md:flex-1">
                      <label htmlFor="twitter" className={classLabel}>
                        {t('createCoin.form.otherOptions.twitter.label')}
                      </label>
                      <input
                        type="text"
                        id="twitter"
                        name="twitter"
                        value={formData.twitter}
                        onChange={handleInputChange}
                        placeholder={t('createCoin.form.otherOptions.twitter.placeholder')}
                        className={classInput}
                      />
                    </div>

                    {/* Website */}
                    <div className="w-full md:flex-1">
                      <label htmlFor="website" className={classLabel}>
                        {t('createCoin.form.otherOptions.website.label')}
                      </label>
                      <input
                        type="text"
                        id="website"
                        name="website"
                        value={formData.website}
                        onChange={handleInputChange}
                        placeholder={t('createCoin.form.otherOptions.website.placeholder')}
                        className={classInput}
                      />
                      {errors.website && (
                        <p className="mt-1 text-xs text-red-500">
                          {t('createCoin.form.otherOptions.website.invalid')}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="mt-4 md:mt-6 lg:mt-8 pt-3 md:pt-4 lg:pt-0 text-center">
              {isAuthenticated ? (
                  <button
                  type="submit"
                  disabled={isSubmitting || !isAuthenticated}
                  className="lg:max-w-auto max-w-[250px] group relative bg-gradient-to-t from-theme-primary-500 to-theme-secondary-400 py-1.5 px-3 md:px-4 lg:px-6 rounded-full transition-all duration-500 hover:from-theme-blue-100 hover:to-theme-blue-200 hover:scale-105 hover:shadow-lg hover:shadow-theme-primary-500/30 active:scale-95 w-full md:w-auto"
                >
                  <span className="relative z-10 text-theme-neutral-100">{isSubmitting ? t('createCoin.form.submit.creating') : t('createCoin.form.submit.create')}</span>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-theme-primary-300 to-theme-secondary-200 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm"></div>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSigninModalOpen(true)}
                  className="lg:max-w-auto max-w-[250px] group relative bg-gradient-to-t from-theme-primary-500 to-theme-secondary-400 py-1.5 px-3 md:px-4 lg:px-6 rounded-full transition-all duration-500 hover:from-theme-blue-100 hover:to-theme-blue-200 hover:scale-105 hover:shadow-lg hover:shadow-theme-primary-500/30 active:scale-95 w-full md:w-auto"
                >
                  <span className="relative z-10 text-theme-neutral-100">{t('connect')}</span>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-theme-primary-300 to-theme-secondary-200 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm"></div>
                </button>
              )}
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-1/3 space-y-3 md:space-y-4 lg:space-y-6 flex flex-col gap-2 mt-3 md:mt-0">
          {/* My Coins */}
          <div className="rounded-lg md:rounded-xl border-create-coin-light bg-white dark:bg-inherit shadow-inset dark:border p-3 md:p-4 lg:p-6 shadow-lg dark:border-my-coin flex-1 flex flex-col justify-between z-10">
            <div>
              <h2 className="text-center text-sm md:text-base lg:text-lg font-bold dark:text-theme-neutral-100 text-theme-neutral-900 mb-3 md:mb-4 lg:mb-6 flex items-center justify-center gap-1.5 md:gap-2">
                {ethereumIcon(14, 14)}
                {t('createCoin.myCoins.title')}
                {ethereumIcon(14, 14)}
              </h2>

              <div className="flex justify-evenly mb-3 md:mb-4 lg:mb-6">
                <button
                  onClick={() => setActiveTab("today")}
                  className={`dark:text-theme-neutral-100 text-sm hover:text-gray-300 ${activeTab === "today"
                    ? "text-theme-primary-300 dark:text-theme-gradient-linear-start"
                    : "dark:text-theme-neutral-100 text-sm hover:text-gray-300"
                    }`}
                >
                  {t('createCoin.tabs.today')}
                </button>
                <button
                  onClick={() => setActiveTab("last8days")}
                  className={` text-sm hover:text-gray-300 ${activeTab === "last8days"
                    ? "text-theme-primary-300 dark:text-theme-gradient-linear-start"
                    : "dark:text-theme-neutral-100 text-sm hover:text-gray-300"
                    }`}
                >
                  {t('createCoin.tabs.last8days')}
                </button>
                <button
                  onClick={() => setActiveTab("lastmonth")}
                  className={` text-sm hover:text-gray-300 ${activeTab === "lastmonth"
                    ? "text-theme-primary-300 dark:text-theme-gradient-linear-start"
                    : "dark:text-theme-neutral-100 text-sm hover:text-gray-300"
                    }`}
                >
                  {t('createCoin.tabs.lastMonth')}
                </button>
              </div>
              {filteredMemeCoins.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-4 md:py-6 lg:py-8">
                  <img src={"/no-list-token.png"} alt="no-coin-icon" width={100} height={100} className="md:w-[120px] md:h-[120px] lg:w-[180px] lg:h-[180px]" />
                  <p className="dark:text-theme-neutral-100 text-theme-neutral-900 mt-2 md:mt-3 font-medium text-xs md:text-sm lg:text-base">
                    {t('createCoin.tabs.noCoins')}
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto max-h-[250px] md:max-h-[300px] lg:max-h-none lg:h-[78%]">
                  <div className="z-10 space-y-1.5 md:space-y-2">
                    {filteredMemeCoins.map((coin: TokenData, index: number) => (
                      <div
                        key={coin.token_id}
                        className="flex items-center justify-between dark:hover:bg-transparent hover:bg-theme-green-300 p-1.5 md:p-2 rounded-lg transition-colors duration-200"
                      >
                        <div className="flex items-center gap-1.5 md:gap-2 lg:gap-4">
                          <div className="w-7 h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 bg-gray-300 rounded-full overflow-hidden">
                            <Image
                              src={coin.logo_url || "/user-icon.png"}
                              height={40}
                              width={40}
                              alt="Coin icon"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs md:text-sm lg:text-base truncate">
                              {coin.name}{" "}
                              <span className="text-them-neutral-100">{coin.symbol}</span>
                            </div>
                            <div className="text-[10px] md:text-xs text-them-neutral-100 truncate">
                              {truncateString(coin.address, 6)}
                            </div>
                          </div>
                          <button
                            className="text-them-neutral-100 flex-shrink-0"
                            onClick={() => {
                              navigator.clipboard.writeText(coin.address);
                              notify({
                                message: t("createCoin.tabs.addressCopied"),
                                type: "success"
                              });
                            }}
                          >
                            <Copy size={14} className="md:w-[16px] md:h-[16px] lg:w-[18px] lg:h-[18px]" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 md:gap-2 lg:gap-3 ml-1.5 md:ml-2">
                          <button
                            onClick={() => router.push(`/trading?address=${coin.address}`)}
                            className="lg:max-w-auto max-w-[250px] group relative bg-gradient-to-t from-theme-primary-500 to-theme-secondary-400 py-1.5 md:py-2 px-3 md:px-4 lg:px-5 rounded-full transition-all duration-500 hover:from-theme-blue-100 hover:to-theme-blue-200 hover:scale-105 hover:shadow-lg hover:shadow-theme-primary-500/30 active:scale-95 w-full md:w-auto"
                          >
                            <span className="relative z-10 text-theme-neutral-100">{t('createCoin.tabs.trade')}</span>
                            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-theme-primary-300 to-theme-secondary-200 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm"></div>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 md:mt-4 lg:mt-6 text-center">
              <button className="dark:text-theme-neutral-100 cursor-pointer  hover:text-theme-gradient-linear-start text-theme-neutral-900 flex gap-1.5 md:gap-2 items-center justify-center mx-auto  transition-colors">
                <Link
                  href="/my-coin"
                  className="dark:text-theme-neutral-100 text-theme-neutral-900 hover:text-theme-gradient-linear-start font-medium text-[10px] md:text-xs lg:text-xl "
                >
                  {t('createCoin.tabs.seeAll')}
                </Link>
                <ArrowRight className="w-[20px] h-[10px] md:w-[12px] md:h-[12px] lg:w-[15px] lg:h-[20px] text-xl dark:hidden " />
              </button>
            </div>
          </div>

          {/* Guide */}
          <div className="dark:bg-gradient-guide bg-gradient-to-t from-theme-green-300 to-theme-green-400 rounded-lg md:rounded-xl border p-3 md:p-4 lg:p-6 shadow-lg dark:border-my-coin border-create-coin-light">
            <h2 className="text-center text-sm md:text-base lg:text-lg font-bold dark:text-theme-neutral-100 text-theme-neutral-900 mb-3 md:mb-4 lg:mb-6 flex items-center justify-center gap-1.5 md:gap-2">
              {ethereumIcon(14, 14)}
              {t('createCoin.guide.title')}
              {ethereumIcon(14, 14)}
            </h2>

            <ul className="space-y-2 md:space-y-3 lg:space-y-4">
              {tArray('createCoin.guide.rules').map((rule: string, index: number) => (
                <li key={index} className="dark:text-theme-neutral-100 text-theme-neutral-900 font-medium text-[10px] md:text-xs lg:text-sm flex justify-center text-center">
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <ModalSignin isOpen={!isAuthenticated} onClose={() => setIsSigninModalOpen(false)} />
      <PhantomWarningModal isOpen={phantomConnected} onClose={() => {}} />
    </>
  );
}

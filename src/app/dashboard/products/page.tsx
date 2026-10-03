"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Search, Edit2, Trash2, Package, Tag, 
  Layers, AlertTriangle, ArrowRight, Loader2, Save, X, PlusCircle,
  Building, MapPin, AlignLeft, Info
} from "lucide-react";
import { useShop } from "@/context/ShopContext";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { notifyAuditEdit, notifyAuditDelete } from "@/lib/notifications";

type Product = {
  id: string;
  name: string;
  code: string | null;
  unit: string | null;
  sale_price_single: number;
  purchase_price_single: number;
  current_stock: number;
  min_stock_level: number;
  category_id?: string;
  categories?: any;
  brand_id?: string | null;
  brands?: any;
  shelf_location?: string | null;
  note?: string | null;
  pack_size?: number | null;
  purchase_price_pack?: number | null;
  sale_price_pack?: number | null;
  measurement_type?: string | null;
  warranty?: string | null;
  has_imei?: boolean | null;
  formulation_id?: string | null;
  formulations?: any;
  is_ingredient?: boolean | null;
};

type Category = {
  id: string;
  name: string;
};

type Brand = {
  id: string;
  name: string;
};

type Formulation = {
  id: string;
  name: string;
};

type Unit = {
  id: string;
  name: string;
  code: string;
};

type VariationState = {
  id?: string;
  packing_name: string;
  purchase_price: number;
  sale_price: number;
  stock_quantity: number;
  barcode: string;
  is_packing: boolean;
  pack_size: number;
};

function ProductsPageContent() {
  const { shopId, industryType, userName, userRole } = useShop();
  const { language, t } = useLanguage();
  const isUrdu = language === "ur";
  const supabase = createClient();

  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [formulations, setFormulations] = useState<Formulation[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"products" | "categories" | "brands">("products");

  useEffect(() => {
    if (tabParam === "categories" || tabParam === "brands" || tabParam === "products") {
      setActiveTab(tabParam as any);
    } else {
      setActiveTab("products");
    }
  }, [tabParam]);

  // Category Modals & Forms State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);

  // Brand Modals & Forms State
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandName, setBrandName] = useState("");
  const [isSubmittingBrand, setIsSubmittingBrand] = useState(false);

  // Formulation Modals & Forms State
  const [isFormulationModalOpen, setIsFormulationModalOpen] = useState(false);
  const [editingFormulation, setEditingFormulation] = useState<Formulation | null>(null);
  const [formulationName, setFormulationName] = useState("");
  const [isSubmittingFormulation, setIsSubmittingFormulation] = useState(false);

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    unit: "",
    purchase_price_single: 0,
    sale_price_single: 0,
    current_stock: 0,
    min_stock_level: 5,
    category_id: "",
    brand_id: "",
    shelf_location: "",
    note: "",
    measurement_type: "standard",
    warranty: "",
    has_imei: false,
    formulation_id: ""
  });

  // IMEI Management State
  const [isImeiModalOpen, setIsImeiModalOpen] = useState(false);
  const [productImeis, setProductImeis] = useState<any[]>([]);
  const [newImei1, setNewImei1] = useState("");
  const [newImei2, setNewImei2] = useState("");

  // Packing Variations State
  const [variations, setVariations] = useState<VariationState[]>([]);
  const [newVar, setNewVar] = useState({
    packing_name: "",
    purchase_price: 0,
    sale_price: 0,
    stock_quantity: 0,
    barcode: "",
    is_packing: false,
    pack_size: 10
  });

  // Bulk Packing Helper State (Gatta / Bori / Box)
  const [hasBoxPacking, setHasBoxPacking] = useState(false);
  const [boxPackingName, setBoxPackingName] = useState(industryType === "pharmacy" ? "Box" : (industryType === "tailor" ? "Thaan" : "Gatta"));
  const [boxPackSize, setBoxPackSize] = useState(50);
  const [boxPurchasePrice, setBoxPurchasePrice] = useState(0);
  const [boxSalePrice, setBoxSalePrice] = useState(0);
  const [boxBarcode, setBoxBarcode] = useState("");

  // Quick Add State
  const [showCategoryQuickAdd, setShowCategoryQuickAdd] = useState(false);
  const [showBrandQuickAdd, setShowBrandQuickAdd] = useState(false);
  const [showFormulationQuickAdd, setShowFormulationQuickAdd] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState("");
  const [quickBrandName, setQuickBrandName] = useState("");
  const [quickFormulationName, setQuickFormulationName] = useState("");
  const [isSavingQuick, setIsSavingQuick] = useState(false);

  // Restaurant-specific: dynamic pricing flag
  const [isDynamicPricing, setIsDynamicPricing] = useState(false);
  // Restaurant-specific: inventory tracking flag
  const [isInventoryManaged, setIsInventoryManaged] = useState(false);
  // Restaurant-specific: raw ingredient flag
  const [isIngredient, setIsIngredient] = useState(false);

  useEffect(() => {
    if (shopId) {
      fetchProducts();
      fetchCategories();
      fetchBrands();
      fetchUnits();
      if (industryType === "pharmacy") fetchFormulations();
    }

    const handleAppRefresh = () => {
      if (shopId) {
        fetchProducts();
        fetchCategories();
        fetchBrands();
        fetchUnits();
        if (industryType === "pharmacy") fetchFormulations();
      }
    };

    window.addEventListener("app-refresh", handleAppRefresh);
    return () => window.removeEventListener("app-refresh", handleAppRefresh);
  }, [shopId, industryType]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let { data, error } = await supabase
        .from("products")
        .select(`
          id, name, code, unit, sale_price_single, purchase_price_single, current_stock, min_stock_level, category_id, brand_id, shelf_location, note, pack_size, purchase_price_pack, sale_price_pack, measurement_type, warranty, has_imei, is_ingredient,
          categories ( name ),
          brands ( name ),
          formulations ( name )
        `)
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false });

      if (error) {
        if (error.message.includes("is_ingredient") || error.hint?.includes("is_ingredient")) {
          const fallback = await supabase
            .from("products")
            .select(`
              id, name, code, unit, sale_price_single, purchase_price_single, current_stock, min_stock_level, category_id, brand_id, shelf_location, note, pack_size, purchase_price_pack, sale_price_pack, measurement_type, warranty, has_imei,
              categories ( name ),
              brands ( name ),
              formulations ( name )
            `)
            .eq("shop_id", shopId)
            .order("created_at", { ascending: false });
          if (fallback.error) throw fallback.error;
          setProducts((fallback.data || []).map((p: any) => ({ ...p, is_ingredient: false })));
          return;
        }
        throw error;
      }
      setProducts(data || []);
    } catch (err: any) {
      toast.error("Failed to load products: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("shop_id", shopId)
        .order("name", { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (err: any) {
      console.error("Failed to load categories: ", err.message);
    }
  };

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from("brands")
        .select("id, name")
        .eq("shop_id", shopId)
        .order("name", { ascending: true });

      if (error) throw error;
      setBrands(data || []);
    } catch (err: any) {
      console.error("Failed to load brands: ", err.message);
    }
  };

  const fetchFormulations = async () => {
    try {
      const { data, error } = await supabase
        .from("formulations")
        .select("id, name")
        .eq("shop_id", shopId)
        .order("name", { ascending: true });

      if (error) throw error;
      setFormulations(data || []);
    } catch (err: any) {
      console.error("Failed to load formulations: ", err.message);
    }
  };

  const fetchUnits = async () => {
    try {
      const { data, error } = await supabase
        .from("units")
        .select("id, name, code")
        .eq("shop_id", shopId)
        .order("name", { ascending: true });

      if (error) throw error;
      setUnits(data || []);
    } catch (err: any) {
      console.error("Failed to load units: ", err.message);
    }
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      code: "",
      unit: units[0]?.code || "",
      purchase_price_single: 0,
      sale_price_single: 0,
      current_stock: 0,
      min_stock_level: 5,
      category_id: categories[0]?.id || "",
      brand_id: brands[0]?.id || "",
      shelf_location: "",
      note: "",
      measurement_type: "standard",
      warranty: "",
      has_imei: false,
      formulation_id: ""
    });
    setProductImeis([]);
    setVariations([]);
    setNewVar({ packing_name: "", purchase_price: 0, sale_price: 0, stock_quantity: 0, barcode: "", is_packing: false, pack_size: 10 });
    setHasBoxPacking(false);
    setBoxPackingName(industryType === "pharmacy" ? "Box" : (industryType === "tailor" ? "Thaan" : "Gatta"));
    setBoxPackSize(50);
    setBoxPurchasePrice(0);
    setBoxSalePrice(0);
    setBoxBarcode("");
    // Reset restaurant-specific flags
    setIsDynamicPricing(false);
    setIsInventoryManaged(false);
    setIsIngredient(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (product: Product) => {
    setEditingProduct(product);
    const hasPack = !!(product.pack_size && product.pack_size > 0);
    setFormData({
      name: product.name,
      code: product.code || "",
      unit: product.unit || "",
      purchase_price_single: product.purchase_price_single || 0,
      sale_price_single: product.sale_price_single || 0,
      current_stock: product.current_stock || 0,
      min_stock_level: product.min_stock_level || 0,
      category_id: product.category_id || "",
      brand_id: product.brand_id || "",
      shelf_location: product.shelf_location || "",
      note: product.note || "",
      measurement_type: product.measurement_type || "standard",
      warranty: product.warranty || "",
      has_imei: product.has_imei || false,
      formulation_id: product.formulation_id || ""
    });
    
    // Fetch product IMEIs if editing
    try {
      const { data: imeiData, error: imeiError } = await supabase
        .from("product_imeis")
        .select("*")
        .eq("product_id", product.id);
      if (imeiError) throw imeiError;
      setProductImeis(imeiData || []);
    } catch (err: any) {
      console.error("Failed to load product IMEIs: ", err.message);
      setProductImeis([]);
    }
    setHasBoxPacking(hasPack);
    setBoxPackSize(product.pack_size || 50);
    setBoxPurchasePrice(product.purchase_price_pack || 0);
    setBoxSalePrice(product.sale_price_pack || 0);

    // Fetch existing variations and their barcodes
    try {
      const { data: varsData, error } = await supabase
        .from("product_variants")
        .select(`
          id, packing_name, purchase_price, sale_price, stock_quantity, is_packing, pack_size,
          product_barcodes ( barcode )
        `)
        .eq("product_id", product.id);

      if (error) throw error;

      if (varsData) {
        const mapped: VariationState[] = varsData.map((v: any) => ({
          id: v.id,
          packing_name: v.packing_name,
          purchase_price: v.purchase_price || 0,
          sale_price: v.sale_price || 0,
          stock_quantity: v.stock_quantity || 0,
          barcode: v.product_barcodes?.[0]?.barcode || "",
          is_packing: !!v.is_packing,
          pack_size: v.pack_size || 10
        }));
        setVariations(mapped.filter(v => !(v.is_packing && hasPack)));

        // Load box packing name from variants
        const boxVar = mapped.find(v => v.is_packing && hasPack);
        if (boxVar) {
          setBoxBarcode(""); // barcode from variant
          const match = boxVar.packing_name.match(/^([^(]+)/);
          setBoxPackingName(match ? match[1].trim() : (industryType === "pharmacy" ? "Box" : (industryType === "tailor" ? "Thaan" : "Gatta")));
        } else {
          setBoxPackingName(industryType === "pharmacy" ? "Box" : (industryType === "tailor" ? "Thaan" : "Gatta"));
          setBoxBarcode("");
        }
      } else {
        setVariations([]);
        setBoxPackingName(industryType === "pharmacy" ? "Box" : (industryType === "tailor" ? "Thaan" : "Gatta"));
        setBoxBarcode("");
      }
    } catch (err: any) {
      console.error("Failed to load variations: ", err.message);
      setVariations([]);
      setBoxPackingName(industryType === "pharmacy" ? "Box" : (industryType === "tailor" ? "Thaan" : "Gatta"));
      setBoxBarcode("");
    }

    // Restore restaurant-specific flags from product data
    if (industryType === "restaurant") {
      const isDynamic = product.note === "DYNAMIC_PRICE";
      setIsDynamicPricing(isDynamic);
      // If product has unit or positive stock - it was inventory managed
      const hasInventory = !!(product.unit && product.unit !== "") || (product.current_stock > 0);
      setIsInventoryManaged(hasInventory);
      setIsIngredient(!!product.is_ingredient);
    }

    setIsModalOpen(true);
  };

  const handleAddVariation = () => {
    if (!newVar.packing_name) {
      toast.error("Packing Name is required.");
      return;
    }
    const finalStock = newVar.is_packing
      ? Math.floor(formData.current_stock / (newVar.pack_size || 10))
      : newVar.stock_quantity;
    const formattedName = newVar.is_packing && !newVar.packing_name.toLowerCase().includes("pcs")
      ? `${newVar.packing_name} (${newVar.pack_size} ${formData.unit || 'pcs'})`
      : newVar.packing_name;
    setVariations([
      ...variations,
      { ...newVar, stock_quantity: finalStock, packing_name: formattedName }
    ]);
    setNewVar({
      packing_name: "",
      purchase_price: 0,
      sale_price: 0,
      stock_quantity: 0,
      barcode: "",
      is_packing: false,
      pack_size: 10
    });
  };

  const handleRemoveVariation = (idx: number) => {
    setVariations(variations.filter((_, i) => i !== idx));
  };

  const handleSaveProduct = async () => {
    if (!shopId) {
      toast.error("Shop not loaded yet. Please refresh and try again.");
      return;
    }
    if (!formData.name) {
      toast.error("Product name is required.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const stockToSave = formData.has_imei
        ? productImeis.filter((i: any) => i.status !== "sold").length
        : formData.current_stock;

      const dbPayload = {
        shop_id: shopId,
        name: formData.name,
        code: formData.code || null,
        unit: (industryType === "restaurant" && !isInventoryManaged) ? null : (formData.unit || null),
        purchase_price_single: formData.purchase_price_single,
        sale_price_single: (industryType === "restaurant" && isIngredient) ? 0 : formData.sale_price_single,
        current_stock: stockToSave,
        min_stock_level: formData.min_stock_level,
        category_id: formData.category_id || null,
        brand_id: formData.brand_id || null,
        shelf_location: formData.shelf_location || null,
        note: formData.note || null,
        pack_size: hasBoxPacking ? boxPackSize : null,
        purchase_price_pack: hasBoxPacking ? boxPurchasePrice : null,
        sale_price_pack: hasBoxPacking ? boxSalePrice : null,
        measurement_type: formData.measurement_type || "standard",
        warranty: formData.warranty || null,
        has_imei: formData.has_imei || false,
        formulation_id: formData.formulation_id || null,
        is_ingredient: false,
      };

      let productId = "";

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(dbPayload)
          .eq("id", editingProduct.id);
        if (error) throw error;
        productId = editingProduct.id;
        toast.success(isUrdu ? "پروڈکٹ کامیابی سے اپ ڈیٹ ہو گئی!" : "Product updated successfully!");
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert(dbPayload)
          .select()
          .single();
        if (error) throw error;
        productId = data.id;
        toast.success(isUrdu ? "پروڈکٹ کامیابی سے شامل ہو گئی!" : "Product added successfully!");
      }

      // Sync IMEI records
      if (formData.has_imei) {
        const { data: dbImeis } = await supabase
          .from("product_imeis")
          .select("id, imei1, imei2, status")
          .eq("product_id", productId);

        const dbImeiIds = (dbImeis || []).map((i: any) => i.id);
        const localImeiIds = productImeis.filter((i: any) => i.id).map((i: any) => i.id);

        // IMEIs in DB but missing in local state: delete (only if 'available')
        const toDeleteIds = (dbImeis || [])
          .filter((i: any) => i.status === "available" && !localImeiIds.includes(i.id))
          .map((i: any) => i.id);

        if (toDeleteIds.length > 0) {
          await supabase.from("product_imeis").delete().in("id", toDeleteIds);
        }

        // New IMEIs to insert (no id)
        const toInsert = productImeis
          .filter((i: any) => !i.id)
          .map((i: any) => ({
            product_id: productId,
            shop_id: shopId,
            imei1: i.imei1,
            imei2: i.imei2 || null,
            status: "available"
          }));

        if (toInsert.length > 0) {
          const { error: insertImeiError } = await supabase
            .from("product_imeis")
            .insert(toInsert);
          if (insertImeiError) throw insertImeiError;
        }
      } else {
        // Delete all available IMEIs for this product if disabled
        await supabase
          .from("product_imeis")
          .delete()
          .eq("product_id", productId)
          .eq("status", "available");
      }

      // Delete existing variations before re-inserting
      if (editingProduct) {
        await supabase.from("product_variants").delete().eq("product_id", productId);
      }

      // Build final variations list — inject box packing if checked
      let finalVariations = [...variations];
      if (hasBoxPacking && boxPackSize > 0) {
        const boxVarName = `${boxPackingName} (${boxPackSize} ${formData.unit || 'pcs'})`;
        const boxStock = Math.floor(formData.current_stock / boxPackSize);
        finalVariations.push({
          packing_name: boxVarName,
          purchase_price: boxPurchasePrice,
          sale_price: boxSalePrice,
          stock_quantity: boxStock,
          barcode: boxBarcode,
          is_packing: true,
          pack_size: boxPackSize
        });
      }

      // Insert all variations
      for (const variant of finalVariations) {
        const { data: insertedVar, error: varError } = await supabase
          .from("product_variants")
          .insert({
            product_id: productId,
            shop_id: shopId,
            packing_name: variant.packing_name,
            purchase_price: variant.purchase_price,
            sale_price: variant.sale_price,
            stock_quantity: variant.stock_quantity,
            is_packing: variant.is_packing || false,
            pack_size: variant.is_packing ? (variant.pack_size || 10) : 1
          })
          .select()
          .single();

        if (varError) throw varError;

        if (variant.barcode && insertedVar) {
          await supabase.from("product_barcodes").insert({
            product_id: productId,
            variant_id: insertedVar.id,
            shop_id: shopId,
            barcode: variant.barcode
          });
        }
      }

      setIsModalOpen(false);

      if (editingProduct) {
        notifyAuditEdit(
          userName || "Admin",
          userRole || "Admin",
          "products",
          formData.name,
          `Price: Rs ${formData.sale_price_single}, Stock: ${formData.current_stock}`
        );
      }

      fetchProducts();
    } catch (err: any) {
      toast.error((isUrdu ? "پروڈکٹ محفوظ کرنے میں خرابی: " : "Error saving product: ") + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm(isUrdu ? "کیا آپ واقعی یہ پروڈکٹ حذف کرنا چاہتے ہیں؟" : "Are you sure you want to delete this product?")) return;
    try {
      const targetProd = products.find(p => p.id === id);
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      notifyAuditDelete(
        userName || "Admin",
        userRole || "Admin",
        "products",
        targetProd?.name || `Product #${id.slice(0, 8)}`,
        "Deleted from products catalog"
      );

      toast.success(isUrdu ? "پروڈکٹ کامیابی سے ڈیلیٹ ہو گئی!" : "Product deleted successfully!");
      fetchProducts();
    } catch (err: any) {
      toast.error((isUrdu ? "پروڈکٹ ڈیلیٹ کرنے میں ناکامی: " : "Failed to delete product: ") + err.message);
    }
  };

  const handleQuickAddCategory = async () => {
    if (!shopId) {
      toast.error(isUrdu ? "شاپ آئی ڈی لوڈ نہیں ہو سکی۔ براہ کرم ریفریش کریں۔" : "Shop not loaded yet. Please refresh and try again.");
      return;
    }
    if (!quickCategoryName) return;
    setIsSavingQuick(true);
    try {
      const { data, error } = await supabase
        .from("categories")
        .insert({ shop_id: shopId, name: quickCategoryName })
        .select()
        .single();
      if (error) throw error;
      toast.success(isUrdu ? "کیٹیگری کامیابی سے شامل ہو گئی!" : "Category added!");
      setCategories([...categories, data]);
      setFormData(prev => ({ ...prev, category_id: data.id }));
      setQuickCategoryName("");
      setShowCategoryQuickAdd(false);
    } catch (err: any) {
      toast.error((isUrdu ? "شامل کرنے میں ناکامی: " : "Failed: ") + err.message);
    } finally {
      setIsSavingQuick(false);
    }
  };

  const handleQuickAddBrand = async () => {
    if (!shopId) {
      toast.error(isUrdu ? "شاپ آئی ڈی لوڈ نہیں ہو سکی۔ براہ کرم ریفریش کریں۔" : "Shop not loaded yet. Please refresh and try again.");
      return;
    }
    if (!quickBrandName) return;
    setIsSavingQuick(true);
    try {
      const { data, error } = await supabase
        .from("brands")
        .insert({ shop_id: shopId, name: quickBrandName })
        .select()
        .single();
      if (error) throw error;
      toast.success(isUrdu ? "برانڈ کامیابی سے شامل ہو گیا!" : "Brand added!");
      setBrands([...brands, data]);
      setFormData(prev => ({ ...prev, brand_id: data.id }));
      setQuickBrandName("");
      setShowBrandQuickAdd(false);
    } catch (err: any) {
      toast.error((isUrdu ? "شامل کرنے میں ناکامی: " : "Failed: ") + err.message);
    } finally {
      setIsSavingQuick(false);
    }
  };

  const handleQuickAddFormulation = async () => {
    if (!quickFormulationName) return;
    setIsSavingQuick(true);
    try {
      const { data, error } = await supabase
        .from("formulations")
        .insert({ shop_id: shopId, name: quickFormulationName })
        .select()
        .single();
      if (error) throw error;
      toast.success(isUrdu ? "فارمولیشن کامیابی سے شامل ہو گئی!" : "Formulation added!");
      setFormulations([...formulations, data]);
      setFormData(prev => ({ ...prev, formulation_id: data.id }));
      setQuickFormulationName("");
      setShowFormulationQuickAdd(false);
    } catch (err: any) {
      toast.error((isUrdu ? "شامل کرنے میں ناکامی: " : "Failed: ") + err.message);
    } finally {
      setIsSavingQuick(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryName) {
      toast.error(isUrdu ? "کیٹیگری کا نام درج کرنا لازمی ہے۔" : "Category name is required.");
      return;
    }
    setIsSubmittingCategory(true);
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from("categories")
          .update({ name: categoryName })
          .eq("id", editingCategory.id);
        if (error) throw error;
        toast.success(isUrdu ? "کیٹیگری اپ ڈیٹ ہو گئی!" : "Category updated successfully!");
      } else {
        const { error } = await supabase
          .from("categories")
          .insert({ shop_id: shopId, name: categoryName });
        if (error) throw error;
        toast.success(isUrdu ? "نئی کیٹیگری بن گئی!" : "Category created successfully!");
      }
      setIsCategoryModalOpen(false);
      setCategoryName("");
      setEditingCategory(null);
      fetchCategories();
      fetchProducts();
    } catch (err: any) {
      toast.error((isUrdu ? "کیٹیگری محفوظ کرنے میں خرابی: " : "Error saving category: ") + err.message);
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm(isUrdu ? "کیا آپ واقعی یہ کیٹیگری حذف کرنا چاہتے ہیں؟" : "Are you sure you want to delete this category? Products in this category will become Uncategorized.")) return;
    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success(isUrdu ? "کیٹیگری حذف ہو گئی!" : "Category deleted successfully!");
      fetchCategories();
      fetchProducts();
    } catch (err: any) {
      toast.error((isUrdu ? "کیٹیگری ڈیلیٹ کرنے میں ناکامی: " : "Failed to delete category: ") + err.message);
    }
  };

  const handleSaveBrand = async () => {
    if (!brandName) {
      toast.error(isUrdu ? "برانڈ کا نام درج کرنا لازمی ہے۔" : "Brand name is required.");
      return;
    }
    setIsSubmittingBrand(true);
    try {
      if (editingBrand) {
        const { error } = await supabase
          .from("brands")
          .update({ name: brandName })
          .eq("id", editingBrand.id);
        if (error) throw error;
        toast.success(isUrdu ? "برانڈ اپ ڈیٹ ہو گیا!" : "Brand updated successfully!");
      } else {
        const { error } = await supabase
          .from("brands")
          .insert({ shop_id: shopId, name: brandName });
        if (error) throw error;
        toast.success(isUrdu ? "نیا برانڈ شامل ہو گیا!" : "Brand created successfully!");
      }
      setIsBrandModalOpen(false);
      setBrandName("");
      setEditingBrand(null);
      fetchBrands();
      fetchProducts();
    } catch (err: any) {
      toast.error((isUrdu ? "برانڈ محفوظ کرنے میں خرابی: " : "Error saving brand: ") + err.message);
    } finally {
      setIsSubmittingBrand(false);
    }
  };

  const handleDeleteBrand = async (id: string) => {
    if (!confirm(isUrdu ? "کیا آپ واقعی یہ برانڈ حذف کرنا چاہتے ہیں؟" : "Are you sure you want to delete this brand? Products in this brand will become No Brand.")) return;
    try {
      const { error } = await supabase
        .from("brands")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success(isUrdu ? "برانڈ حذف ہو گیا!" : "Brand deleted successfully!");
      fetchBrands();
      fetchProducts();
    } catch (err: any) {
      toast.error((isUrdu ? "برانڈ ڈیلیٹ کرنے میں ناکامی: " : "Failed to delete brand: ") + err.message);
    }
  };

  const getCategoryProductCount = (categoryId: string) => {
    return products.filter(p => p.category_id === categoryId).length;
  };

  const getBrandProductCount = (brandId: string) => {
    return products.filter(p => p.brand_id === brandId).length;
  };

  const getCategoryName = (categories: any) => {
    const fallback = isUrdu ? "بغیر کیٹیگری" : "Uncategorized";
    if (!categories) return fallback;
    if (Array.isArray(categories)) {
      return categories[0]?.name || fallback;
    }
    return categories.name || fallback;
  };

  const getBrandName = (brands: any) => {
    const fallback = isUrdu ? "بغیر برانڈ" : "No Brand";
    if (!brands) return fallback;
    if (Array.isArray(brands)) {
      return brands[0]?.name || fallback;
    }
    return brands.name || fallback;
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.code && p.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Statistics
  const totalItems = products.length;
  const outOfStockItems = products.filter(p => p.current_stock <= 0).length;
  const lowStockItems = products.filter(p => p.current_stock > 0 && p.current_stock <= p.min_stock_level).length;
  const inventoryValue = products.reduce((acc, p) => acc + (p.purchase_price_single * p.current_stock), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans">
      
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder={
              activeTab === "products" 
                ? (isUrdu ? "پروڈکٹ کا نام یا بارکوڈ تلاش کریں..." : (industryType === "tailor" ? "Search materials..." : "Search products..."))
                : activeTab === "categories" 
                  ? (isUrdu ? "کیٹیگری تلاش کریں..." : "Search categories...") 
                  : (isUrdu ? "برانڈ تلاش کریں..." : "Search brands...")
            } 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full sm:w-[250px] bg-white border-slate-200"
          />
        </div>
        {activeTab === "products" && (
          <div className="flex gap-2.5">
            <Button onClick={handleOpenAddModal} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
              <Plus className="mr-2 h-4 w-4" /> {isUrdu ? "نئی پروڈکٹ شامل کریں" : (industryType === "restaurant" ? "Add Menu Item" : (industryType === "tailor" ? "Add Material" : "Add Product"))}
            </Button>
          </div>
        )}
        {activeTab === "categories" && (
          <Button onClick={() => { setEditingCategory(null); setCategoryName(""); setIsCategoryModalOpen(true); }} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
            <Plus className="mr-2 h-4 w-4" /> {isUrdu ? "نئی کیٹیگری بنائیں" : (industryType === "tailor" ? "Add Material Category" : "Add Category")}
          </Button>
        )}
        {activeTab === "brands" && (
          <Button onClick={() => { setEditingBrand(null); setBrandName(""); setIsBrandModalOpen(true); }} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
            <Plus className="mr-2 h-4 w-4" /> {isUrdu ? "نیا برانڈ / کمپنی" : (industryType === "tailor" ? "Add Supplier / Brand" : "Add Brand")}
          </Button>
        )}
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex border-b border-slate-200">
        {[
          { id: "products", label: isUrdu ? "تمام پروڈکٹس اور اسٹاک" : (industryType === "restaurant" ? "Menu Items" : (industryType === "tailor" ? "Materials & Fabrics" : "Products Catalog")), count: totalItems },
          { id: "categories", label: isUrdu ? "کیٹیگریز" : (industryType === "restaurant" ? "Menu Categories" : (industryType === "tailor" ? "Material Categories" : "Categories")), count: categories.length },
          // Hide Brands tab for restaurant
          ...(industryType !== "restaurant" ? [{ id: "brands", label: isUrdu ? "برانڈز و کمپنیاں" : (industryType === "tailor" ? "Brands & Suppliers" : "Brands & Companies"), count: brands.length }] : [])
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); setSearchQuery(""); }}
            className={`py-3 px-6 font-bold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            {tab.label}
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
              activeTab === tab.id ? "bg-primary/15 text-primary" : "bg-slate-100 text-slate-600"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Panel: Products */}
      {activeTab === "products" && (
        <>
          {/* Quick Stats Banner */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
                <Package size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">{isUrdu ? "کل پروڈکٹس" : "Total Products"}</p>
                <p className="text-xl font-bold text-slate-950 mt-0.5">{totalItems}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center border border-red-100">
                <AlertTriangle size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">{isUrdu ? "ختم شدہ اسٹاک" : "Out of Stock"}</p>
                <p className="text-xl font-bold text-slate-950 mt-0.5">{outOfStockItems}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100">
                <AlertTriangle size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">{isUrdu ? "کم اسٹاک الرٹ" : "Low Stock Alert"}</p>
                <p className="text-xl font-bold text-slate-950 mt-0.5">{lowStockItems}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
                <Tag size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">{isUrdu ? "کل اسٹاک ویلیو" : "Inventory Value"}</p>
                <p className="text-xl font-bold text-slate-950 mt-0.5">Rs {inventoryValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
              </div>
            </div>
          </div>

          {/* Products Data Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-6 py-4">{isUrdu ? "پروڈکٹ کا نام" : (industryType === "restaurant" ? "Dish / Item Name" : (industryType === "tailor" ? "Material Name" : "Product Name"))}</th>
                    <th className="px-6 py-4">{isUrdu ? "بارکوڈ / کوڈ" : "Barcode / Code"}</th>
                    <th className="px-6 py-4">{isUrdu ? "کیٹیگری" : (industryType === "restaurant" ? "Menu Category" : (industryType === "tailor" ? "Material Category" : "Category"))}</th>
                    {industryType !== "restaurant" && <th className="px-6 py-4">{isUrdu ? "برانڈ / کمپنی" : (industryType === "tailor" ? "Brand / Supplier" : "Brand / Company")}</th>}
                    <th className="px-6 py-4 text-right">{isUrdu ? "قیمت خرید" : (industryType === "restaurant" ? "Cost Price" : "Purchase Price")}</th>
                    <th className="px-6 py-4 text-right">{isUrdu ? "قیمت فروخت" : (industryType === "restaurant" ? "Selling Price" : "Sale Price")}</th>
                    <th className="px-6 py-4 text-center">{isUrdu ? "موجودہ اسٹاک" : (industryType === "restaurant" ? "Availability" : "Stock")}</th>
                    <th className="px-6 py-4 text-right">{isUrdu ? "ایکشنز" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-slate-400">{isUrdu ? "پروڈکٹس لوڈ ہو رہی ہیں..." : "Loading catalog..."}</td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-slate-400 flex flex-col items-center">
                        <Package className="h-10 w-10 text-slate-300 mb-2" />
                        <p>{isUrdu ? "کوئی پروڈکٹ نہیں ملی۔ نئی پروڈکٹ شامل کرنے کے لیے بٹن دبائیں۔" : "No products found. Click \"Add Product\" to create one."}</p>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => {
                      const isLow = product.current_stock <= product.min_stock_level;
                      const isOut = product.current_stock <= 0;

                      return (
                        <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-800 text-sm">
                            <div>
                              <p>{product.name}</p>
                              <div className="flex gap-1.5 flex-wrap mt-0.5">
                                {product.shelf_location && (
                                  <span className="text-[10px] text-slate-400 font-normal flex items-center gap-0.5">
                                    <MapPin size={10} /> {product.shelf_location}
                                  </span>
                                )}
                                {industryType === "hardware" && (product as any).measurement_type && (product as any).measurement_type !== "standard" && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${
                                    (product as any).measurement_type === "dimension"
                                      ? "bg-purple-50 text-purple-700 border-purple-200"
                                      : "bg-blue-50 text-blue-700 border-blue-200"
                                  }`}>
                                    {(product as any).measurement_type === "dimension" ? "📐 Dimension-based" : "📏 Length-based"}
                                  </span>
                                )}
                                {product.pack_size && product.pack_size > 0 && (
                                  <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-semibold">
                                    📦 {isUrdu ? `پیکنگ: ${product.pack_size} ${product.unit || 'عدد'}/پیک` : `Packing: ${product.pack_size} ${product.unit || 'pcs'}/pack`}
                                  </span>
                                )}
                                {/* Restaurant-specific badges */}
                                {industryType === "restaurant" && product.is_ingredient && (
                                  <span className="text-[10px] bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded font-semibold">
                                    🥕 Raw Ingredient
                                  </span>
                                )}
                                {industryType === "restaurant" && !product.is_ingredient && product.note === "DYNAMIC_PRICE" && (
                                  <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-semibold">
                                    💬 Dynamic Price
                                  </span>
                                )}
                                {industryType === "restaurant" && !product.is_ingredient && product.note !== "DYNAMIC_PRICE" && (
                                  <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-semibold">
                                    🏷️ Fixed Price
                                  </span>
                                )}
                                {industryType === "restaurant" && (product.is_ingredient || product.unit) && (
                                  <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold">
                                    📦 Stock Tracked
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">{product.code || "—"}</td>
                          <td className="px-6 py-4">
                            <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded text-[11px] font-semibold border border-slate-200">
                              {getCategoryName(product.categories)}
                            </span>
                          </td>
                          {industryType !== "restaurant" && <td className="px-6 py-4 text-slate-600 font-medium">{getBrandName(product.brands)}</td>}
                          <td className="px-6 py-4 text-right font-semibold text-slate-600">
                            {industryType === "restaurant" && product.purchase_price_single === 0 ? "—" : `Rs ${product.purchase_price_single}`}
                          </td>
                          <td className="px-6 py-4 text-right font-black text-blue-650">
                            {industryType === "restaurant" && product.is_ingredient
                              ? <span className="text-slate-400 font-normal text-xs">— (Raw Material)</span>
                              : industryType === "restaurant" && product.note === "DYNAMIC_PRICE"
                                ? <span className="text-amber-600 font-bold text-xs">Ask at order</span>
                                : `Rs ${product.sale_price_single}`
                            }
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              isOut 
                                ? "bg-red-100 text-red-700" 
                                : isLow 
                                  ? "bg-amber-100 text-amber-700" 
                                  : "bg-emerald-100 text-emerald-700"
                            }`}>
                              {product.current_stock} {product.unit || "pcs"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleOpenEditModal(product)}
                              className="text-slate-600 hover:text-blue-605 hover:bg-slate-100"
                              title={isUrdu ? "ترمیم کریں" : "Edit"}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteProduct(product.id)}
                              className="text-slate-600 hover:text-red-655 hover:bg-slate-100"
                              title={isUrdu ? "حذف کریں" : "Delete"}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Tab Panel: Categories */}
      {activeTab === "categories" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-4">{isUrdu ? "کیٹیگری کا نام" : "Category Name"}</th>
                  <th className="px-6 py-4">{isUrdu ? "منسلک پروڈکٹس" : "Linked Products"}</th>
                  <th className="px-6 py-4 text-right">{isUrdu ? "ایکشنز" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-slate-400 flex flex-col items-center">
                      <Layers className="h-10 w-10 text-slate-300 mb-2" />
                      <p>{isUrdu ? "کوئی کیٹیگری موجود نہیں ہے۔" : "No categories configured yet."}</p>
                    </td>
                  </tr>
                ) : categories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-slate-400">
                      {isUrdu ? "کوئی کیٹیگری نہیں ملی۔" : "No categories match your search."}
                    </td>
                  </tr>
                ) : (
                  categories
                    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((cat) => (
                      <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800 text-sm">{cat.name}</td>
                        <td className="px-6 py-4 text-slate-500 font-semibold">{getCategoryProductCount(cat.id)} {isUrdu ? "پروڈکٹس" : "products"}</td>
                        <td className="px-6 py-4 text-right space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => { setEditingCategory(cat); setCategoryName(cat.name); setIsCategoryModalOpen(true); }}
                            className="text-slate-600 hover:text-blue-600 hover:bg-slate-100"
                            title={isUrdu ? "ترمیم کریں" : "Edit"}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="text-slate-600 hover:text-red-600 hover:bg-slate-100"
                            title={isUrdu ? "حذف کریں" : "Delete"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Panel: Brands */}
      {activeTab === "brands" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-4">{isUrdu ? "برانڈ / کمپنی کا نام" : "Brand / Company Name"}</th>
                  <th className="px-6 py-4">{isUrdu ? "منسلک پروڈکٹس" : "Linked Products"}</th>
                  <th className="px-6 py-4 text-right">{isUrdu ? "ایکشنز" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {brands.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-slate-400 flex flex-col items-center">
                      <Building className="h-10 w-10 text-slate-300 mb-2" />
                      <p>{isUrdu ? "کوئی برانڈ موجود نہیں ہے۔" : "No brands configured yet."}</p>
                    </td>
                  </tr>
                ) : brands.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-slate-400">
                      {isUrdu ? "کوئی برانڈ نہیں ملا۔" : "No brands match your search."}
                    </td>
                  </tr>
                ) : (
                  brands
                    .filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((br) => (
                      <tr key={br.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800 text-sm">{br.name}</td>
                        <td className="px-6 py-4 text-slate-500 font-semibold">{getBrandProductCount(br.id)} {isUrdu ? "پروڈکٹس" : "products"}</td>
                        <td className="px-6 py-4 text-right space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => { setEditingBrand(br); setBrandName(br.name); setIsBrandModalOpen(true); }}
                            className="text-slate-600 hover:text-blue-600 hover:bg-slate-100"
                            title={isUrdu ? "ترمیم کریں" : "Edit"}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteBrand(br.id)}
                            className="text-slate-600 hover:text-red-600 hover:bg-slate-100"
                            title={isUrdu ? "حذف کریں" : "Delete"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Category */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={() => setIsCategoryModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm relative z-10 border border-slate-150"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-sm">
                  {isUrdu ? (editingCategory ? "کیٹیگری میں ترمیم کریں" : "نئی کیٹیگری بنائیں") : (editingCategory ? "Edit Category" : "Add New Category")}
                </h3>
                <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 hover:text-slate-605 cursor-pointer">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    {isUrdu ? "کیٹیگری کا نام *" : "Category Name *"}
                  </label>
                  <Input 
                    placeholder={isUrdu ? "مثال: اینٹی بائیوٹک، بیوریجز، سنیکس..." : "e.g. Beverages, Bakery, Antibiotics"} 
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="rounded-xl h-10 text-xs border-slate-200"
                  />
                </div>
                <Button 
                  onClick={handleSaveCategory} 
                  disabled={isSubmittingCategory}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold h-10 rounded-xl shadow-md mt-1 cursor-pointer"
                >
                  {isSubmittingCategory ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {isUrdu ? "کیٹیگری محفوظ کریں" : "Save Category"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Add/Edit Brand */}
      <AnimatePresence>
        {isBrandModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={() => setIsBrandModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm relative z-10 border border-slate-150"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-sm">
                  {isUrdu ? (editingBrand ? "برانڈ / کمپنی میں ترمیم کریں" : "نیا برانڈ / کمپنی شامل کریں") : (editingBrand ? "Edit Brand" : "Add New Brand")}
                </h3>
                <button onClick={() => setIsBrandModalOpen(false)} className="text-slate-400 hover:text-slate-605 cursor-pointer">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    {isUrdu ? "برانڈ / کمپنی کا نام *" : "Brand / Company Name *"}
                  </label>
                  <Input 
                    placeholder={isUrdu ? "مثال: GSK، Getz Pharma، Abbott..." : "e.g. GSK, Abbott, Getz Pharma"} 
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="rounded-xl h-10 text-xs border-slate-200"
                  />
                </div>
                <Button 
                  onClick={handleSaveBrand} 
                  disabled={isSubmittingBrand}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold h-10 rounded-xl shadow-md mt-1 cursor-pointer"
                >
                  {isSubmittingBrand ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {isUrdu ? "برانڈ محفوظ کریں" : "Save Brand"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Add/Edit Product */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={() => setIsModalOpen(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl relative z-10 overflow-hidden my-8"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-805">
                  {isUrdu 
                    ? (editingProduct ? "پروڈکٹ میں ترمیم کریں" : "نئی پروڈکٹ / آئٹم شامل کریں")
                    : (editingProduct 
                      ? (industryType === "restaurant" ? "Edit Menu Item" : (industryType === "tailor" ? "Edit Material / Fabric" : "Edit Product"))
                      : (industryType === "restaurant" ? "Add New Menu Item" : (industryType === "tailor" ? "Add New Material / Fabric" : "Add New Product"))
                    )
                  }
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                
                {/* RESTAURANT: Simplified Menu Item Form */}
                {industryType === "restaurant" ? (
                  <div className="space-y-5">
                    {/* Item Type Switch (Menu Item vs Raw Ingredient) */}
                    <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          setIsIngredient(false);
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                          !isIngredient
                            ? "bg-white text-blue-600 shadow-sm border border-blue-100"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        🍽️ Menu Item / Dish (فروخت کے لیے)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsIngredient(true);
                          setIsInventoryManaged(true);
                          setIsDynamicPricing(false);
                          setFormData(prev => ({ ...prev, unit: prev.unit || "kg" }));
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                          isIngredient
                            ? "bg-white text-orange-600 shadow-sm border border-orange-100"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        🥕 Raw Ingredient / Material (کچا مال)
                      </button>
                    </div>

                    {/* Item Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                        {isIngredient ? "🥕 Raw Ingredient Name (کچے اجزاء کا نام) *" : "🍽️ Menu Item Name (ڈش کا نام) *"}
                      </label>
                      <Input
                        placeholder={isIngredient ? "e.g. Chicken, Wheat Flour, Cooking Oil, Rice, Spices..." : "e.g. Daal Chawal, Chicken Karahi, Cold Coffee..."}
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="h-11 text-sm font-semibold border-slate-200"
                        autoFocus
                      />
                    </div>

                    {/* Pricing Type Toggle (Hide for raw ingredients) */}
                    {!isIngredient ? (
                      <div className="border-2 rounded-2xl overflow-hidden">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">💰 Pricing Type</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Fixed = price always same. Dynamic = waiter will enter price at time of order.</p>
                        </div>
                        <div className="grid grid-cols-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsDynamicPricing(false);
                              setFormData({...formData, note: ""});
                            }}
                            className={`p-4 text-left transition-all ${
                              !isDynamicPricing
                                ? "bg-blue-600 text-white"
                                : "bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <div className="text-lg mb-1">🏷️</div>
                            <p className="font-bold text-sm">Fixed Price</p>
                            <p className={`text-[11px] mt-0.5 ${!isDynamicPricing ? "text-blue-100" : "text-slate-400"}`}>
                              Set a fixed selling price
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsDynamicPricing(true);
                              setFormData({...formData, note: "DYNAMIC_PRICE", sale_price_single: 0});
                            }}
                            className={`p-4 text-left border-l transition-all ${
                              isDynamicPricing
                                ? "bg-amber-500 text-white"
                                : "bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <div className="text-lg mb-1">💬</div>
                            <p className="font-bold text-sm">Dynamic Price</p>
                            <p className={`text-[11px] mt-0.5 ${isDynamicPricing ? "text-amber-100" : "text-slate-400"}`}>
                              Ask price at order time
                            </p>
                          </button>
                        </div>

                        {/* Fixed Price Input */}
                        {!isDynamicPricing && (
                          <div className="p-4 border-t border-slate-200 bg-white grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Cost Price (Optional, Rs)</label>
                              <Input
                                type="number"
                                placeholder="0"
                                value={formData.purchase_price_single || ""}
                                onChange={(e) => setFormData({...formData, purchase_price_single: Math.max(0, parseFloat(e.target.value) || 0)})}
                                className="h-9"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Selling Price (Rs) *</label>
                              <Input
                                type="number"
                                placeholder="e.g. 350"
                                value={formData.sale_price_single || ""}
                                onChange={(e) => setFormData({...formData, sale_price_single: Math.max(0, parseFloat(e.target.value) || 0)})}
                                className="h-9 border-blue-300 focus-visible:ring-blue-500"
                              />
                            </div>
                          </div>
                        )}

                        {/* Dynamic Price Info */}
                        {isDynamicPricing && (
                          <div className="p-4 border-t border-amber-200 bg-amber-50">
                            <div className="flex items-start gap-2.5">
                              <span className="text-lg">💬</span>
                              <div>
                                <p className="text-xs font-bold text-amber-800">Price will be asked at order time</p>
                                <p className="text-[11px] text-amber-600 mt-0.5">When waiter adds this item in POS, a popup will appear asking for the price. Example: "50 ki daal dena"</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Cost Price Input for Raw Ingredients */
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cost Price / Purchase Rate (Rs) *</label>
                          <Input
                            type="number"
                            placeholder="e.g. 280 (Cost per kg/liter/unit)"
                            value={formData.purchase_price_single || ""}
                            onChange={(e) => setFormData({...formData, purchase_price_single: Math.max(0, parseFloat(e.target.value) || 0)})}
                            className="h-10 border-slate-200 bg-white"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">Average supplier cost for purchase orders and expense reports.</p>
                        </div>
                        <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-3.5 flex items-start gap-2">
                          <span className="text-base mt-0.5">💡</span>
                          <div className="text-left">
                            <p className="text-xs font-bold text-orange-950">Raw Material Mode</p>
                            <p className="text-[10px] text-orange-700/80 font-semibold mt-0.5">This item is set as a raw material/ingredient. It will only be visible in the stock purchases, not in the POS menu.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Menu/Ingredient Category */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                          {isIngredient ? "📂 Ingredient Category (Optional)" : "📂 Menu Category (Optional)"}
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowCategoryQuickAdd(!showCategoryQuickAdd)}
                          className="text-xs text-blue-600 hover:underline font-bold"
                        >
                          {showCategoryQuickAdd ? "Cancel" : "➕ New Category"}
                        </button>
                      </div>
                      {showCategoryQuickAdd && (
                        <div className="flex gap-2 mb-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                          <Input
                            placeholder={isIngredient ? "e.g. Meat, Vegetables, Groceries..." : "e.g. Starters, Main Course, Drinks..."}
                            value={quickCategoryName}
                            onChange={(e) => setQuickCategoryName(e.target.value)}
                            className="h-9 bg-white"
                          />
                          <Button
                            type="button"
                            disabled={isSavingQuick}
                            onClick={handleQuickAddCategory}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-4 text-xs shrink-0"
                          >
                            Save
                          </Button>
                        </div>
                      )}
                      <SearchableSelect
                        value={formData.category_id}
                        onChange={(val) => setFormData({...formData, category_id: val})}
                        options={categories.map(c => ({ value: c.id, label: c.name }))}
                        placeholder={isIngredient ? "Select Category" : "Select Menu Category"}
                      />
                    </div>

                    {/* Description (Only for non-ingredients) */}
                    {!isIngredient && (
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">📝 Description / Notes (Optional)</label>
                        <textarea
                          placeholder="e.g. Contains dairy, spicy level, special instructions..."
                          value={isDynamicPricing ? "" : (formData.note === "DYNAMIC_PRICE" ? "" : formData.note || "")}
                          onChange={(e) => setFormData({...formData, note: isDynamicPricing ? "DYNAMIC_PRICE" : e.target.value})}
                          disabled={isDynamicPricing}
                          rows={2}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none disabled:bg-slate-50 disabled:text-slate-400"
                        />
                      </div>
                    )}

                    {/* Track Inventory Option (Force show fields if isIngredient) */}
                    {isIngredient ? (
                      <div className="border-2 border-emerald-400 rounded-2xl overflow-hidden bg-emerald-50/10">
                        <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-200">
                          <p className="font-bold text-sm text-emerald-800 flex items-center gap-1.5">
                            <span>📦</span> Raw Material Stock & Inventory Management
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Set measurement units, initial stock, and low stock warnings for purchase tracking.
                          </p>
                        </div>
                        <div className="p-4 bg-emerald-50/30 grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Unit (اکائی)</label>
                            <select
                              value={formData.unit}
                              onChange={(e) => setFormData({...formData, unit: e.target.value})}
                              className="w-full bg-white border border-slate-200 h-9 rounded-lg px-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold"
                            >
                              <option value="kg">Kilograms (kg)</option>
                              <option value="pcs">Pieces (pcs)</option>
                              <option value="btl">Bottles (btl)</option>
                              <option value="can">Cans</option>
                              <option value="gm">Grams (gm)</option>
                              <option value="ltr">Liters (ltr)</option>
                              <option value="ml">Milliliter (ml)</option>
                              <option value="box">Box</option>
                              <option value="pkt">Packet (pkt)</option>
                              {units.map(u => (
                                <option key={u.id} value={u.code}>{u.name} ({u.code})</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Current Stock</label>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={formData.current_stock || ""}
                              onChange={(e) => setFormData({...formData, current_stock: Math.max(0, parseFloat(e.target.value) || 0)})}
                              className="w-full border border-slate-200 h-9 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Low Stock Alert</label>
                            <input
                              type="number"
                              min="0"
                              placeholder="5"
                              value={formData.min_stock_level || ""}
                              onChange={(e) => setFormData({...formData, min_stock_level: Math.max(0, parseFloat(e.target.value) || 0)})}
                              className="w-full border border-slate-200 h-9 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
                            />
                          </div>
                          <div className="col-span-3 bg-emerald-100/60 rounded-lg p-2.5 text-[11px] text-emerald-900 font-semibold flex items-center gap-2">
                            <span>📋</span>
                            <span>This raw material will be restocked via <strong>Ingredient Purchases (خریداری)</strong>.</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className={`border-2 rounded-2xl overflow-hidden transition-all ${isInventoryManaged ? "border-emerald-400" : "border-slate-200"}`}>
                        <button
                          type="button"
                          onClick={() => {
                            setIsInventoryManaged(!isInventoryManaged);
                            if (!isInventoryManaged) {
                              setFormData({...formData, current_stock: 0, min_stock_level: 5, unit: "pcs"});
                            }
                          }}
                          className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-all ${
                            isInventoryManaged ? "bg-emerald-50" : "bg-white hover:bg-slate-50"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                            isInventoryManaged ? "bg-emerald-500 border-emerald-500" : "border-slate-300"
                          }`}>
                            {isInventoryManaged && <span className="text-white text-xs font-black">✓</span>}
                          </div>
                          <div>
                            <p className={`font-bold text-sm ${isInventoryManaged ? "text-emerald-700" : "text-slate-700"}`}>
                              📦 Track Inventory / Stock
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Enable for bottles, drinks, disposables — items that run out. Can be restocked via Purchase Orders.
                            </p>
                          </div>
                        </button>

                        {isInventoryManaged && (
                          <div className="p-4 border-t border-emerald-200 bg-emerald-50/30 grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Unit</label>
                              <select
                                value={formData.unit}
                                onChange={(e) => setFormData({...formData, unit: e.target.value})}
                                className="w-full bg-white border border-slate-200 h-9 rounded-lg px-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold"
                              >
                                <option value="pcs">Pieces (pcs)</option>
                                <option value="btl">Bottles (btl)</option>
                                <option value="can">Cans</option>
                                <option value="kg">Kilograms (kg)</option>
                                <option value="gm">Grams (gm)</option>
                                <option value="ltr">Liters (ltr)</option>
                                <option value="ml">Milliliter (ml)</option>
                                <option value="box">Box</option>
                                <option value="pkt">Packet (pkt)</option>
                                {units.map(u => (
                                  <option key={u.id} value={u.code}>{u.name} ({u.code})</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Current Stock</label>
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={formData.current_stock || ""}
                                onChange={(e) => setFormData({...formData, current_stock: Math.max(0, parseFloat(e.target.value) || 0)})}
                                className="w-full border border-slate-200 h-9 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Low Stock Alert</label>
                              <input
                                type="number"
                                min="0"
                                placeholder="5"
                                value={formData.min_stock_level || ""}
                                onChange={(e) => setFormData({...formData, min_stock_level: Math.max(0, parseFloat(e.target.value) || 0)})}
                                className="w-full border border-slate-200 h-9 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
                              />
                            </div>
                            <div className="col-span-3 bg-emerald-100 rounded-lg p-2.5 text-[11px] text-emerald-800 font-medium flex items-center gap-2">
                              <span>📋</span>
                              <span>This item can be restocked via <strong>Purchase Orders</strong>. Stock will reduce automatically on each sale.</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Column 1: Basic Information */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-b border-blue-50 pb-2 flex items-center gap-1.5">
                      <Package size={14} /> {isUrdu ? "بنیادی پروڈکٹ معلومات" : (industryType === "tailor" ? "Material Details" : "Basic Information")}
                    </h4>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                        {isUrdu ? "پروڈکٹ کا نام *" : (industryType === "tailor" ? "Material Name" : "Product Name *")}
                      </label>
                      <Input 
                        placeholder={isUrdu ? "مثال: Panadol 500mg، Augmentin 625mg..." : (industryType === "tailor" ? "e.g. Wash & Wear White" : "e.g. Wheat Flour 10kg")} 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>

                    {industryType === "hardware" && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                          {isUrdu ? "پیمائش کی قسم" : "Measurement Type"}
                        </label>
                        <select
                          value={formData.measurement_type}
                          onChange={(e) => setFormData({...formData, measurement_type: e.target.value})}
                          className="w-full bg-white border border-slate-200 h-10 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"
                        >
                          <option value="standard">{isUrdu ? "معیاری (سادہ یونٹس/تعداد)" : "Standard (pieces/units)"}</option>
                          <option value="dimension">{isUrdu ? "پیمائش کی بنیاد پر (رقبہ / Area)" : "Dimension-based (Area)"}</option>
                          <option value="length">{isUrdu ? "لمبائی کی بنیاد پر (Running Length)" : "Length-based"}</option>
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                          {isUrdu ? "بارکوڈ / کوڈ" : "Barcode / Code"}
                        </label>
                        <Input 
                          placeholder="e.g. 7483920" 
                          value={formData.code}
                          onChange={(e) => setFormData({...formData, code: e.target.value})}
                        />
                      </div>
                      {industryType !== "pharmacy" && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                            {isUrdu ? "بنیادی یونٹ" : "Base Unit"}
                          </label>
                          <select
                            value={formData.unit}
                            onChange={(e) => setFormData({...formData, unit: e.target.value})}
                            className="w-full bg-white border border-slate-200 h-10 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"
                          >
                            <option value="">{isUrdu ? "یونٹ منتخب کریں" : "Select Unit"}</option>
                            {units.map(u => (
                              <option key={u.id} value={u.code}>{u.name} ({u.code})</option>
                            ))}
                          </select>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {isUrdu ? "صرف کسٹم بیس یونٹس درج ہیں۔" : "Only custom Base Units are listed."}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bulk/Gatta Packing Helper */}
                    <div className="border border-amber-200 p-4 bg-amber-50/30 rounded-2xl space-y-3.5 mt-1">
                      <label className="flex items-center gap-2.5 font-bold text-xs text-slate-700 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={hasBoxPacking} 
                          onChange={(e) => setHasBoxPacking(e.target.checked)}
                          className="rounded text-amber-500 focus:ring-amber-500/20 w-4 h-4"
                        />
                        <span>📦 {isUrdu ? "کیا باکس یا کاٹن پیکنگ موجود ہے؟" : (industryType === "pharmacy" ? "Has Box/Carton Packing?" : "Has Bulk Packing?")}</span>
                      </label>

                      {hasBoxPacking && (
                        <div className="grid grid-cols-2 gap-3.5 pt-3.5 border-t border-amber-200/60">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              {isUrdu ? "پیکنگ کا نام" : "Packing Name"}
                            </label>
                            <Input 
                              placeholder={isUrdu ? "مثال: Box، Carton، Pack" : "e.g. Box, Carton"} 
                              value={boxPackingName}
                              onChange={(e) => setBoxPackingName(e.target.value)}
                              className="h-9 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              {isUrdu ? `تعداد فی پیکنگ (${formData.unit || 'یونٹ'})` : (formData.unit ? `${formData.unit.toUpperCase()} per Packing` : 'Units per Packing')}
                            </label>
                            <Input 
                              type="number" 
                              placeholder="50" 
                              value={boxPackSize || ""}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 0;
                                setBoxPackSize(val);
                                if (val > 0) {
                                  setFormData(prev => ({
                                    ...prev,
                                    purchase_price_single: parseFloat((boxPurchasePrice / val).toFixed(4)) || 0,
                                    sale_price_single: parseFloat((boxSalePrice / val).toFixed(4)) || 0
                                  }));
                                }
                              }}
                              className="h-9 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              {isUrdu ? "پیکنگ قیمت خرید (روپے)" : "Packing Purchase Price (Rs)"}
                            </label>
                            <Input 
                              type="number" 
                              placeholder="0" 
                              value={boxPurchasePrice || ""}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setBoxPurchasePrice(val);
                                if (boxPackSize > 0) {
                                  setFormData(prev => ({
                                    ...prev,
                                    purchase_price_single: parseFloat((val / boxPackSize).toFixed(4)) || 0
                                  }));
                                }
                              }}
                              className="h-9 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              {isUrdu ? "پیکنگ قیمت فروخت (روپے)" : "Packing Sale Price (Rs)"}
                            </label>
                            <Input 
                              type="number" 
                              placeholder="0" 
                              value={boxSalePrice || ""}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setBoxSalePrice(val);
                                if (boxPackSize > 0) {
                                  setFormData(prev => ({
                                    ...prev,
                                    sale_price_single: parseFloat((val / boxPackSize).toFixed(4)) || 0
                                  }));
                                }
                              }}
                              className="h-9 bg-white"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              {isUrdu ? "پیکنگ بارکوڈ (اختیاری)" : "Packing Barcode (Optional)"}
                            </label>
                            <Input 
                              placeholder="e.g. 7483921" 
                              value={boxBarcode}
                              onChange={(e) => setBoxBarcode(e.target.value)}
                              className="h-9 bg-white"
                            />
                          </div>
                          <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-800 font-medium">
                            {isUrdu 
                              ? `💡 فی یونٹ قیمت خود بخود نیچے طے ہو جائے گی: خرید = Rs ${boxPackSize > 0 ? (boxPurchasePrice / boxPackSize).toFixed(2) : '—'} / ${formData.unit || 'یونٹ'}`
                              : `💡 Prices per base unit (${formData.unit || 'unit'}) will be auto-calculated below: Purchase = ${boxPackSize > 0 ? `Rs ${(boxPurchasePrice / boxPackSize).toFixed(2)}` : '—'} / ${formData.unit || 'unit'}`
                            }
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                          {isUrdu ? `قیمت خرید / ${formData.unit || 'یونٹ'} (روپے)` : `Purchase Price / ${formData.unit || 'unit'} (Rs)`}
                        </label>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          value={formData.purchase_price_single || ""}
                          onChange={(e) => setFormData({...formData, purchase_price_single: Math.max(0, parseFloat(e.target.value) || 0)})}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                          {isUrdu ? `قیمت فروخت / ${formData.unit || 'یونٹ'} (روپے)` : `Sale Price / ${formData.unit || 'unit'} (Rs)`}
                        </label>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          value={formData.sale_price_single || ""}
                          onChange={(e) => setFormData({...formData, sale_price_single: Math.max(0, parseFloat(e.target.value) || 0)})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                          {isUrdu ? `ابتدائی اسٹاک (${formData.unit || 'یونٹ'})` : `Opening Stock (${formData.unit || 'unit'})`}
                        </label>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          value={formData.has_imei ? productImeis.filter((i: any) => i.status !== "sold").length : (formData.current_stock || "")}
                          onChange={(e) => setFormData({...formData, current_stock: Math.max(0, parseFloat(e.target.value) || 0)})}
                          disabled={formData.has_imei}
                          className={formData.has_imei ? "bg-slate-100 cursor-not-allowed font-bold" : ""}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                          {isUrdu ? "کم اسٹاک الرٹ کی حد" : "Low Stock Alert Level"}
                        </label>
                        <Input 
                          type="number" 
                          placeholder="5" 
                          value={formData.min_stock_level || ""}
                          onChange={(e) => setFormData({...formData, min_stock_level: Math.max(0, parseFloat(e.target.value) || 0)})}
                        />
                      </div>
                      {formData.has_imei && (
                        <div className="col-span-2 bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-indigo-950">{isUrdu ? "آئی ایم ای آئی ٹریکنگ فعال ہے" : "IMEI Tracking Active"}</p>
                            <p className="text-[10px] text-indigo-500 font-semibold">{isUrdu ? `اسٹاک انفرادی ڈیوائس آئی ایم ای آئی سے مانیٹر ہو رہا ہے (${productImeis.filter((i: any) => i.status !== 'sold').length} دستیاب)۔` : `Stock is managed via individual device IMEIs (${productImeis.filter((i: any) => i.status !== 'sold').length} available).`}</p>
                          </div>
                          <Button
                            type="button"
                            onClick={() => setIsImeiModalOpen(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs h-8 px-3 rounded-lg shadow-sm"
                          >
                            {isUrdu ? "IMEI نمبرز کا انتظام" : "Manage IMEIs"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Column 2: Catalog Options */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-b border-blue-50 pb-2 flex items-center gap-1.5">
                      <Layers size={14} /> {isUrdu ? "کیٹلاگ و برانڈ سیٹنگز" : "Catalog Options"}
                    </h4>

                    {/* Category with inline Quick Add */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-semibold text-slate-500 uppercase">
                          {isUrdu ? "کیٹیگری (اختیاری)" : "Category (Optional)"}
                        </label>
                        <button 
                          type="button" 
                          onClick={() => setShowCategoryQuickAdd(!showCategoryQuickAdd)}
                          className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                        >
                          {showCategoryQuickAdd ? (isUrdu ? "منسوخ" : "Cancel") : (isUrdu ? "➕ فوری بنائیں" : "➕ Quick Add")}
                        </button>
                      </div>
                      {showCategoryQuickAdd ? (
                        <div className="flex gap-2 mb-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <Input 
                            placeholder={isUrdu ? "کیٹیگری کا نام" : "Category name"}
                            value={quickCategoryName}
                            onChange={(e) => setQuickCategoryName(e.target.value)}
                            className="h-9 bg-white"
                          />
                          <Button 
                            type="button" 
                            disabled={isSavingQuick} 
                            onClick={handleQuickAddCategory}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-4 text-xs"
                          >
                            {isUrdu ? "محفوظ کریں" : "Save"}
                          </Button>
                        </div>
                      ) : null}
                      <SearchableSelect
                        value={formData.category_id}
                        onChange={(val) => setFormData({...formData, category_id: val})}
                        options={categories.map(c => ({ value: c.id, label: c.name }))}
                        placeholder={isUrdu ? "کیٹیگری منتخب کریں" : "Select Category"}
                      />
                    </div>

                    {/* Brand with inline Quick Add */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-semibold text-slate-500 uppercase">
                          {isUrdu ? "برانڈ / کمپنی (اختیاری)" : "Company / Brand (Optional)"}
                        </label>
                        <button 
                          type="button" 
                          onClick={() => setShowBrandQuickAdd(!showBrandQuickAdd)}
                          className="text-xs text-primary hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                        >
                          {showBrandQuickAdd ? (isUrdu ? "منسوخ" : "Cancel") : (isUrdu ? "➕ فوری بنائیں" : "➕ Quick Add")}
                        </button>
                      </div>
                      {showBrandQuickAdd ? (
                        <div className="flex gap-2 mb-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <Input 
                            placeholder={isUrdu ? "برانڈ یا کمپنی کا نام" : "Brand/Company name"}
                            value={quickBrandName}
                            onChange={(e) => setQuickBrandName(e.target.value)}
                            className="h-9 bg-white"
                          />
                          <Button 
                            type="button" 
                            disabled={isSavingQuick} 
                            onClick={handleQuickAddBrand}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-4 text-xs"
                          >
                            {isUrdu ? "محفوظ کریں" : "Save"}
                          </Button>
                        </div>
                      ) : null}
                      <SearchableSelect
                        value={formData.brand_id}
                        onChange={(val) => setFormData({...formData, brand_id: val})}
                        options={brands.map(b => ({ value: b.id, label: b.name }))}
                        placeholder={isUrdu ? "برانڈ منتخب کریں" : "Select Brand"}
                      />
                    </div>

                    {/* Formulation with inline Quick Add (Pharmacy Only) */}
                    {industryType === "pharmacy" && (
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-xs font-semibold text-slate-500 uppercase">
                            {isUrdu ? "فارمولیشن / سالٹ (اختیاری)" : "Formulation (Formula/Salt)"}
                          </label>
                          <button 
                            type="button" 
                            onClick={() => setShowFormulationQuickAdd(!showFormulationQuickAdd)}
                            className="text-xs text-primary hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            {showFormulationQuickAdd ? (isUrdu ? "منسوخ" : "Cancel") : (isUrdu ? "➕ فوری بنائیں" : "➕ Quick Add")}
                          </button>
                        </div>
                        {showFormulationQuickAdd ? (
                          <div className="flex gap-2 mb-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <Input 
                              placeholder={isUrdu ? "فارمولا سالٹ کا نام" : "Formula name"}
                              value={quickFormulationName}
                              onChange={(e) => setQuickFormulationName(e.target.value)}
                              className="h-9 bg-white"
                            />
                            <Button 
                              type="button" 
                              disabled={isSavingQuick} 
                              onClick={handleQuickAddFormulation}
                              className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-4 text-xs"
                            >
                              {isUrdu ? "محفوظ کریں" : "Save"}
                            </Button>
                          </div>
                        ) : null}
                        <SearchableSelect
                          value={formData.formulation_id}
                          onChange={(val) => setFormData({...formData, formulation_id: val})}
                          options={formulations.map(f => ({ value: f.id, label: f.name }))}
                          placeholder={isUrdu ? "فارمولیشن منتخب کریں" : "Select Formulation"}
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                        <MapPin size={12} /> {isUrdu ? "شیلف / ریک لوکیشن (اختیاری)" : "Shelf Location (Optional)"}
                      </label>
                      <Input 
                        placeholder={isUrdu ? "مثال: ریک A، شیلف 3" : "e.g. Shelf A, Row 3, Warehouse 1"} 
                        value={formData.shelf_location}
                        onChange={(e) => setFormData({...formData, shelf_location: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                        <AlignLeft size={12} /> {isUrdu ? "اضافی تفصیل / نوٹ (اختیاری)" : "Product Note / Description (Optional)"}
                      </label>
                      <textarea
                        placeholder={isUrdu ? "مثال: ایکسپائری وارننگ یا خصوصی ہدایات..." : "e.g. Expiry warnings, batch notes, specific remarks"} 
                        value={formData.note}
                        onChange={(e) => setFormData({...formData, note: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm h-[88px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    {industryType === "electronics" && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                            <Info size={12} /> {isUrdu ? "وارنٹی / گارنٹی" : "Default Product Warranty"}
                          </label>
                          <Input 
                            placeholder={isUrdu ? "مثال: 1 سال پرزہ جات وارنٹی" : "e.g. 1 Year Parts Warranty"} 
                            value={formData.warranty}
                            onChange={(e) => setFormData({...formData, warranty: e.target.value})}
                          />
                        </div>
                        <div className="flex items-center gap-2 bg-indigo-50/20 p-3 rounded-xl border border-slate-200">
                          <input 
                            type="checkbox"
                            id="has_imei_checkbox"
                            checked={formData.has_imei || false}
                            onChange={(e) => setFormData({...formData, has_imei: e.target.checked})}
                            className="h-4 w-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                          />
                          <label htmlFor="has_imei_checkbox" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                            {isUrdu ? "آئی ایم ای آئی ٹریکنگ ہے (IMEI Numbers)" : "Have IMEI Numbers"}
                          </label>
                        </div>
                      </div>
                    )}

                  </div>

                </div>

                {/* Bottom Section: Packing Variations */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <Tag size={16} className="text-blue-550" /> {isUrdu ? "پیکنگ کی اقسام اور ملٹی پیک بارکوڈز" : "Packing Variations & Multi-pack Barcodes"}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {isUrdu ? "اضافی سیکنڈری پیکنگز (جیسے باکس، کاٹن) الگ قیمت، اسٹاک اور بارکوڈ کے ساتھ شامل کریں۔" : "Add secondary packings (like boxes or cartons) linked with distinct prices, stock, and barcodes."}
                      </p>
                    </div>
                  </div>

                  {/* Add Variation Form Card */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        {isUrdu ? "پیکنگ نام" : "Packing Name"}
                      </label>
                      <Input 
                        placeholder={isUrdu ? "مثال: باکس، کاٹن" : "e.g. Box, Carton"} 
                        value={newVar.packing_name}
                        onChange={(e) => setNewVar({...newVar, packing_name: e.target.value})}
                        className="h-9 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        {isUrdu ? "قیمت خرید" : "Purchase Price"}
                      </label>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        value={newVar.purchase_price || ""}
                        onChange={(e) => setNewVar({...newVar, purchase_price: parseFloat(e.target.value) || 0})}
                        className="h-9 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        {isUrdu ? "قیمت فروخت" : "Sale Price"}
                      </label>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        value={newVar.sale_price || ""}
                        onChange={(e) => setNewVar({...newVar, sale_price: parseFloat(e.target.value) || 0})}
                        className="h-9 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        {isUrdu ? "اسٹاک تعداد" : "Stock Qty"}
                      </label>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        value={newVar.stock_quantity || ""}
                        onChange={(e) => setNewVar({...newVar, stock_quantity: parseFloat(e.target.value) || 0})}
                        className="h-9 bg-white"
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1 flex gap-2">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          {isUrdu ? "بارکوڈ" : "Barcode / Code"}
                        </label>
                        <Input 
                          placeholder="e.g. 7483921" 
                          value={newVar.barcode}
                          onChange={(e) => setNewVar({...newVar, barcode: e.target.value})}
                          className="h-9 bg-white"
                        />
                      </div>
                      <Button 
                        type="button" 
                        onClick={handleAddVariation}
                        className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-3 shrink-0 cursor-pointer"
                      >
                        {isUrdu ? "شامل کریں" : "Add"}
                      </Button>
                    </div>
                  </div>

                  {/* Variations List Table */}
                  {variations.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-slate-100 text-xs">
                      {isUrdu ? "کوئی اضافی پیکنگ درج نہیں ہے۔ اوپر سے شامل کریں۔" : "No packing variations configured. Add one above."}
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-2.5">{isUrdu ? "پیکنگ نام" : "Packing Name"}</th>
                            <th className="px-4 py-2.5">{isUrdu ? "بارکوڈ" : "Barcode / Code"}</th>
                            <th className="px-4 py-2.5 text-right">{isUrdu ? "قیمت خرید" : "Purchase Price"}</th>
                            <th className="px-4 py-2.5 text-right">{isUrdu ? "قیمت فروخت" : "Sale Price"}</th>
                            <th className="px-4 py-2.5 text-center">{isUrdu ? "اسٹاک" : "Stock"}</th>
                            <th className="px-4 py-2.5 text-right">{isUrdu ? "ایکشنز" : "Actions"}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {variations.map((v, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-4 py-2.5 font-bold text-slate-800">{v.packing_name}</td>
                              <td className="px-4 py-2.5 font-mono text-slate-500">{v.barcode || "—"}</td>
                              <td className="px-4 py-2.5 text-right text-slate-600">Rs {v.purchase_price}</td>
                              <td className="px-4 py-2.5 text-right text-blue-600 font-bold">Rs {v.sale_price}</td>
                              <td className="px-4 py-2.5 text-center font-bold text-slate-700">{v.stock_quantity}</td>
                              <td className="px-4 py-2.5 text-right">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleRemoveVariation(idx)}
                                  className="text-slate-500 hover:text-red-600 hover:bg-slate-100 p-1 h-7 w-7 rounded-full cursor-pointer"
                                >
                                  <Trash2 size={12} />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>
              </>
            )}

              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="cursor-pointer">
                  {isUrdu ? "منسوخ کریں" : "Cancel"}
                </Button>
                <Button onClick={handleSaveProduct} disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 shadow-sm cursor-pointer">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {isUrdu ? (editingProduct ? "تبدیلیاں محفوظ کریں" : "پروڈکٹ محفوظ کریں") : (industryType === "restaurant" ? "Save Menu Item" : (industryType === "tailor" ? "Save Material" : "Save Product"))}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Manage IMEI Numbers */}
      <AnimatePresence>
        {isImeiModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={() => setIsImeiModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg relative z-10 border border-slate-150 flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    {isUrdu ? "آئی ایم ای آئی نمبرز کا انتظام" : "Manage IMEI Numbers"}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {isUrdu ? "انفرادی فون IMEI نمبر شامل یا حذف کریں" : "Add or remove individual phone IMEI numbers"}
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsImeiModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Add IMEI Form */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 mb-4 grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    {isUrdu ? "IMEI 1 (لازمی)" : "IMEI 1 (Required)"}
                  </label>
                  <Input 
                    placeholder="e.g. 863920193029103" 
                    value={newImei1}
                    onChange={(e) => setNewImei1(e.target.value.replace(/\D/g, ""))}
                    className="h-9 text-xs rounded-lg border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    {isUrdu ? "IMEI 2 (اختیاری)" : "IMEI 2 (Optional)"}
                  </label>
                  <Input 
                    placeholder="e.g. 863920193029104" 
                    value={newImei2}
                    onChange={(e) => setNewImei2(e.target.value.replace(/\D/g, ""))}
                    className="h-9 text-xs rounded-lg border-slate-200 bg-white"
                  />
                </div>
                <div className="col-span-2">
                  <Button 
                    type="button"
                    onClick={() => {
                      if (!newImei1.trim()) {
                        toast.error(isUrdu ? "IMEI 1 درج کرنا لازمی ہے" : "IMEI 1 is required");
                        return;
                      }
                      if (productImeis.some(i => i.imei1 === newImei1 || (i.imei2 && i.imei2 === newImei1) || (newImei2 && (i.imei1 === newImei2 || (i.imei2 && i.imei2 === newImei2))))) {
                        toast.error(isUrdu ? "یہ IMEI نمبر پہلے سے لسٹ میں موجود ہے" : "This IMEI number is already in the list");
                        return;
                      }
                      setProductImeis([...productImeis, { imei1: newImei1.trim(), imei2: newImei2.trim() || null, status: "available" }]);
                      setNewImei1("");
                      setNewImei2("");
                      toast.success(isUrdu ? "IMEI ڈیوائس شامل ہو گئی!" : "IMEI device added to list");
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs h-9 rounded-lg shadow cursor-pointer"
                  >
                    {isUrdu ? "ڈیوائس شامل کریں" : "Add Device"}
                  </Button>
                </div>
              </div>

              {/* IMEI List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-0">
                {productImeis.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    {isUrdu ? "کوئی IMEI نمبر درج نہیں ہے۔ اوپر سے شامل کریں۔" : "No IMEI numbers registered. Add some above."}
                  </div>
                ) : (
                  productImeis.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white border border-slate-200/80 rounded-xl p-2.5 px-3.5 shadow-sm">
                      <div className="text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-semibold text-slate-800">IMEI 1: {item.imei1}</span>
                          {item.imei2 && <span className="text-slate-300 font-mono text-xs">|</span>}
                          {item.imei2 && <span className="font-mono text-xs font-semibold text-slate-800">IMEI 2: {item.imei2}</span>}
                        </div>
                        <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded mt-1.5 inline-block ${
                          item.status === 'sold' ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-emerald-50 text-emerald-500 border border-emerald-100'
                        }`}>
                          {item.status === 'sold' ? (isUrdu ? "فروخت شدہ" : "sold") : (isUrdu ? "دستیاب" : "available")}
                        </span>
                      </div>
                      {item.status !== 'sold' && (
                        <button
                          type="button"
                          onClick={() => {
                            setProductImeis(productImeis.filter((_, i) => i !== idx));
                            toast.info(isUrdu ? "IMEI ڈیوائس ہٹا دی گئی" : "IMEI device removed");
                          }}
                          className="p-1 hover:bg-red-50 hover:text-red-500 text-slate-400 rounded-lg transition-colors cursor-pointer"
                          title={isUrdu ? "ہٹائیں" : "Remove IMEI"}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                <Button 
                  type="button"
                  onClick={() => setIsImeiModalOpen(false)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs h-9.5 px-4 rounded-xl cursor-pointer"
                >
                  {isUrdu ? "مکمل" : "Done"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-500">Loading Products...</div>}>
      <ProductsPageContent />
    </React.Suspense>
  );
}

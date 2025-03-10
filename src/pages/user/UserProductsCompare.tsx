import React, { useState, useEffect, useRef } from 'react';
import { Accordion, AccordionTab } from 'primereact/accordion';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Rating } from 'primereact/rating';
import { InputText } from 'primereact/inputtext';
import { Toast } from 'primereact/toast';
// import s21 from '/src/assets/img/s21.png';
import { useCart } from './CartContext';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { useCallback } from 'react';
import { debounce } from 'lodash';
import { Helmet } from 'react-helmet';

interface Product {
    productDetails: any;
    variant: any;
    baseProductName: any;
    id: string;
    name: string;
    images: string[];
    trademark: string;
    originalPrice: number;
    discountPrice: number;
    discount: number;
    rating: number;
    specs: {
        os: string;
        cpu: string;
        gpu: string;
        ram: string;
        storage: string;
        rearCamera: string;
        frontCamera: string;
        screenTech: string;
        screenSize: string;
        refreshRate: string;
        brightness: string;
        battery: string;
        charging: string;
    };
}

// interface LocationState {
//     comparisonData?: Product[];
//     products?: Product[];
//   }

interface ProductData {
    [key: string]: Product;
}

const API_URL = `${import.meta.env.VITE_API_URL}`;

const UserProductsCompare = () => {
    // const [selectedProducts, setSelectedProducts] = useState<(Product | null)[]>([]);
    const [showDialog, setShowDialog] = useState(false);
    const [, setActiveSlot] = useState<number | null>(null);
    const { comparisonUrl } = useParams();
    const [activeIndexes] = useState([0]);
    const [products, setProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const toast = useRef<Toast>(null);
    const [showOnlyDifferences, setShowOnlyDifferences] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);    
    const [isLoading, setIsLoading] = useState(false);
    const [productDatabase, setProductDatabase] = useState<ProductData>({});

    const location = useLocation();
    // const locationState = location.state as LocationState;

    const searchProducts = async (searchTerm: string) => {
        if (!searchTerm.trim()) {
            return;
        }
    
        try {
            setIsLoading(true);
            const response = await axios.get(`${API_URL}/products/search`, {
                params: { query: searchTerm }
            });
    
            if (response.data.success) {
                const formattedData: ProductData = {};
                response.data.data.forEach((product: any) => {
                    console.log('Raw product data:', product);
                    
                    const productKey = generateSlug(product.name + '-' + product.variant?.storage);

                    const images = product.images || [product.image];
                    console.log('Processed images:', images);
                    
                    // Fix price handling
                    const originalPrice = Number(product.originalPrice) || Number(product.price) || 0;
                    const discount = Number(product.discount) || 0;
                    const discountPrice = product.discountPrice || 
                        (originalPrice * (1 - discount / 100));
    
                    console.log('Processed price values:', {
                        originalPrice,
                        discount,
                        discountPrice
                    });
    
                    formattedData[productKey] = {
                        id: product._id,
                        name: product.name,
                        baseProductName: product.baseProductName,
                        productDetails: product.productDetails || {},
                        trademark: product.trademark || product.productDetails?.trademark || 'Unknown',
                        images: images.map((img: string) => 
                            img.startsWith('/images/') ? img : `/images/phone/${product.trademark?.toUpperCase()}/${product.baseProductName.replace(/\s+/g, '')}/${img}`
                        ),
                        originalPrice: originalPrice,
                        discountPrice: discountPrice,
                        discount: discount,
                        rating: product.rating?.average || 0,
                        specs: {
                            os: product.specs?.os || product.productDetails?.os || 'N/A',
                            cpu: product.specs?.cpu || product.productDetails?.cpu || 'N/A',
                            gpu: product.specs?.gpu || product.productDetails?.gpu || 'N/A',
                            ram: product.variant?.ram || 'N/A',
                            storage: product.variant?.storage || 'N/A',
                            rearCamera: product.specs?.rearCamera || product.productDetails?.camera?.main || 'N/A',
                            frontCamera: product.specs?.frontCamera || product.productDetails?.camera?.front || 'N/A',
                            screenTech: product.specs?.screenTech || product.productDetails?.display?.type || 'N/A',
                            screenSize: product.specs?.screenSize || product.productDetails?.display?.size || 'N/A',
                            refreshRate: product.specs?.refreshRate || product.productDetails?.display?.refresh_rate || 'N/A',
                            brightness: product.specs?.brightness || product.productDetails?.display?.brightness || 'N/A',
                            battery: product.specs?.battery || product.productDetails?.battery?.capacity || 'N/A',
                            charging: product.specs?.charging || product.productDetails?.battery?.charging || 'N/A'
                        },
                        variant: {
                            ram: product.variant?.ram,
                            storage: product.variant?.storage
                        }
                    };
                });
    
                console.log('Formatted search results:', formattedData);
                setProductDatabase(formattedData);
            }
        } catch (error) {
            console.error('[SearchProducts] Error:', error);
            toast.current?.show({
                severity: 'error',
                summary: 'Lỗi',
                detail: 'Không thể tải danh sách sản phẩm',
                life: 3000
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    // Add debounce to prevent too many API calls
    const debouncedSearch = useCallback(
        debounce((term: string) => {
            searchProducts(term);
        }, 500),
        []
    );

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);
        debouncedSearch(value);
    };

    const formatDisplayName = (product: Product): string => {
        const isIphone = product.name.toLowerCase().includes('iphone');
        if (isIphone) {
            // For iPhones, show without RAM
            return `${product.baseProductName} ${product.specs.storage}`;
        }
        // For other products, show with RAM
        return `${product.name}`;
    };

    useEffect(() => {
        const fetchComparisonData = async () => {
            try {
                if (location.state?.products) {
                    console.log('Original products from state:', location.state.products);
                    
                    // Maintain original data structure without transforming
                    const formattedProducts = location.state.products.map((product: {
                        productDetails: any;
                        trademark: any; id: any; name: any; baseProductName: any; images: any; image: any; originalPrice: any; price: number; discountPrice: any; discount: any; rating: { average: any; }; specs: { os: any; cpu: any; gpu: any; camera: { main: any; front: any; }; rearCamera: any; frontCamera: any; display: { type: any; size: any; refresh_rate: any; brightness: any; }; screenTech: any; screenSize: any; refreshRate: any; brightness: any; battery: { capacity: any; charging: any; }; charging: any; }; variant: { ram: any; storage: any; }; 
}) => ({
                        id: product.id,
                        name: product.name,
                        baseProductName: product.baseProductName,
                        images: product.images || [product.image], // Handle both array and single image
                        trademark: product.trademark || product.productDetails?.trademark,
                        originalPrice: product.originalPrice || product.price,
                        discountPrice: product.discountPrice || (product.price * (1 - (product.discount || 0) / 100)),
                        discount: product.discount || 0,
                        rating: product.rating?.average || product.rating || 0,
                        specs: {
                            os: product.specs.os,
                            cpu: product.specs.cpu,
                            gpu: product.specs.gpu,
                            ram: product.variant.ram,
                            storage: product.variant.storage,
                            rearCamera: product.specs.camera?.main || product.specs.rearCamera,
                            frontCamera: product.specs.camera?.front || product.specs.frontCamera,
                            screenTech: product.specs.display?.type || product.specs.screenTech,
                            screenSize: product.specs.display?.size || product.specs.screenSize,
                            refreshRate: product.specs.display?.refresh_rate || product.specs.refreshRate,
                            brightness: product.specs.display?.brightness || product.specs.brightness,
                            battery: product.specs.battery?.capacity || product.specs.battery,
                            charging: product.specs.battery?.charging || product.specs.charging
                        },
                        variant: {
                            ram: product.variant.ram,
                            storage: product.variant.storage
                        }
                    }));
    
                    console.log('Formatted products:', formattedProducts);
                    setProducts(formattedProducts);
                    return;
                }
                // ... rest of the code
            } catch (error) {
                console.error('Error in fetchComparisonData:', error);
            }
        };
    
        fetchComparisonData();
    }, [comparisonUrl, location.state]);

    // useEffect(() => {
    //     if (comparisonUrl) {
    //         const productSlugs = comparisonUrl.split('-vs-');
    //         console.log('Product slugs:', productSlugs);
    
    //         const selectedProducts = productSlugs
    //             .map(slug => {
    //                 const product = productDatabase[slug];
    //                 console.log(`Found product for slug ${slug}:`, product);
    //                 return product;
    //             })
    //             .filter(Boolean);
    
    //         console.log('Selected products:', selectedProducts);
    //         setProducts(selectedProducts);
    //     }
    // }, [comparisonUrl]);

    // const formatProductName = (name: string) => {
    //     return name
    //         .split('-')
    //         .join(' ')
    //         .toUpperCase();
    // };

    useEffect(() => {
        const handleScroll = () => {
            const row1Height = document.getElementById('row1')?.offsetHeight || 0;
            const scrollThreshold = row1Height * 0.8;
            setIsScrolled(window.scrollY > scrollThreshold);
        };
    
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navigate = useNavigate();
    const getProductNames = () => {
        if (products.length === 0) return 'So sánh sản phẩm';
        return `<span class="text-lg">So sánh sản phẩm</span><br/><br/>
                <span class="text-lg">
                    ${products.map(p => formatDisplayName(p)).join('<br/><br/>&<br/><br/>')}
                </span>`;
    };

    const removeProduct = (productId: string) => {
        const updatedProducts = products.filter(p => p.id !== productId);
        if (updatedProducts.length === 1) {
            toast.current?.show({
                severity: 'info',
                summary: 'Thông báo',
                detail: 'Bạn có thể thêm sản phẩm khác để so sánh',
                life: 3000
            });
        }
        const newUrl = updatedProducts.map(product => {
            const name = product.baseProductName.toLowerCase().replace(/ /g, '-');
            const storage = product.variant?.storage || '';
            const isIphone = name.includes('iphone');
            const slug = isIphone 
                ? `${name}-${storage}`
                : `${name}-${product.variant?.ram}-${storage}`;
            return slug.replace(/\s+/g, '-');
        }).join('-vs-');
        setProducts(updatedProducts);
        
        navigate(`/products/compare/${newUrl}`, {
            state: { 
                products: updatedProducts 
            },
            replace: true
        });
    };

    const addProduct = (product: Product) => {
        const updatedProducts = [...products, {
            ...product,
            trademark: product.trademark || product.productDetails?.trademark,
        }];
        
        const newUrl = updatedProducts.map(product => {
            const name = product.baseProductName.toLowerCase().replace(/ /g, '-');
            const storage = product.variant?.storage || '';
            const isIphone = name.includes('iphone');
            const slug = isIphone 
                ? `${name}-${storage}`                                              // For iPhones: only include storage
                : `${name}-${product.variant?.ram}-${storage}`;                     // For others: include RAM and storage
            return slug.replace(/\s+/g, '-');
        }).join('-vs-');
    
        // Navigate với state mới
        navigate(`/products/compare/${newUrl}`, {
            state: { 
                products: updatedProducts 
            },
            replace: true                                                           // Use replace to avoid adding to history stack
        });
        
        setShowDialog(false);
    };

    const formatPrice = (price?: number) => {
        if (price === undefined || price === null) return '0';
        return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    const generateSlug = (name: string) => {
        return name.toLowerCase().replace(/ /g, '-');
    };

    // const renderSpecifications = () => {
    //     const specCategories = {
    //         hardware: [
    //             { key: 'os', label: 'Hệ điều hành' },
    //             { key: 'cpu', label: 'Chip xử lý (CPU)' },
    //             { key: 'gpu', label: 'Chip đồ họa (GPU)' },
    //         ],
    //         memory: [
    //             { key: 'ram', label: 'RAM' },
    //             { key: 'storage', label: 'Bộ nhớ trong' },
    //         ],
    //         camera: [
    //             { key: 'camera.main', label: 'Camera sau' },
    //             { key: 'camera.front', label: 'Camera trước' },
    //         ],
    //         display: [
    //             { key: 'display.type', label: 'Công nghệ màn hình' },
    //             { key: 'display.size', label: 'Kích thước màn hình' },
    //             { key: 'display.refresh_rate', label: 'Tần số quét' },
    //             { key: 'display.brightness', label: 'Độ sáng tối đa' },
    //         ],
    //         battery: [
    //             { key: 'battery.capacity', label: 'Dung lượng pin' },
    //             { key: 'battery.charging', label: 'Công nghệ sạc' },
    //         ],
    //     };

    //     const getNestedValue = (obj: any, path: string) => {
    //         return path.split('.').reduce((acc, part) => acc?.[part], obj);
    //     };

    //     const hasDifferences = (specKey: string): boolean => {
    //         if (products.length < 2) return false;
    //         const firstValue = getNestedValue(products[0].specs, specKey);
    //         return products.some(p => getNestedValue(p.specs, specKey) !== firstValue);
    //     };

    //     return (
    //         <>
    //             {Object.entries(specCategories).map(([category, specs]) => (
    //                 <div key={category} className="grid grid-cols-4 gap-4 border rounded-lg mb-4">
    //                     <div className="col-span-4">
    //                         <Accordion multiple activeIndex={[0]}>
    //                             <AccordionTab header={category.charAt(0).toUpperCase() + category.slice(1)}>
    //                                 <div className="grid grid-cols-4">
    //                                     <div className="p-4">
    //                                         <ul className="list-none p-0 m-0">
    //                                             {specs.map(({ key, label }) => (
    //                                                 (!showOnlyDifferences || hasDifferences(key)) && (
    //                                                     <li key={key} className="mb-6 pb-2 border-b border-gray-200">
    //                                                         {label}
    //                                                     </li>
    //                                                 )
    //                                             ))}
    //                                         </ul>
    //                                     </div>
    //                                     {products.map((product) => (
    //                                         <div key={product.id} className="flex flex-col gap-4 p-4">
    //                                             {specs.map(({ key }) => (
    //                                                 (!showOnlyDifferences || hasDifferences(key)) && (
    //                                                     <div key={key} className="mb-2 pb-2 border-b border-gray-200">
    //                                                         {getNestedValue(product.specs, key) || 'N/A'}
    //                                                     </div>
    //                                                 )
    //                                             ))}
    //                                         </div>
    //                                     ))}
    //                                     {products.length < 3 && (
    //                                         <div className="flex flex-col gap-4 p-4">
    //                                             {/* Empty column for potential third product */}
    //                                         </div>
    //                                     )}
    //                                 </div>
    //                             </AccordionTab>
    //                         </Accordion>
    //                     </div>
    //                 </div>
    //             ))}
    //         </>
    //     );
    // };

    const renderProductCards = () => {
        return (
            <>
                {/* Fixed container for minimized view */}
                <div 
                    className={`fixed border border-gray-200 shadow-lg top-0 bg-white z-50 transition-all duration-300 transform ${
                        isScrolled ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'
                    }`}
                    style={{ height: '160px', maxWidth: '1200px', width: '100%', right: '50px' }}
                >
                    <div className="container mx-auto px-4 py-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Checkbox */}
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={showOnlyDifferences}
                                    onChange={(e) => setShowOnlyDifferences(e.target.checked)}
                                    className="w-4 h-4 mr-2 ml-2 sm:ml-10 accent-blue-500"
                                />
                                <label className="text-sm text-gray-600">Chỉ xem điểm khác biệt</label>
                            </div>
    
                            {/* Minimized Product Cards */}
                            {products.map((product) => (
                                <Link 
                                    key={product.id} 
                                    to={`/products/detail/${generateProductLink(product)}`}
                                    className="hover:no-underline"
                                >
                                    <div className="p-3 mt-2 border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 bg-white">
                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Column 1: Image */}
                                            <div className="flex items-center justify-center">
                                                <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                                                    <img 
                                                        src={getImageUrl(product)}
                                                        alt={product.name}
                                                        className="w-full h-full object-contain transition-transform duration-200 hover:scale-105"
                                                        // onError={(e) => {
                                                        //     const target = e.target as HTMLImageElement;
                                                        //     console.error('Image load error:', {
                                                        //         product: product.name,
                                                        //         src: target.src
                                                        //     });
                                                        //     target.onerror = null;
                                                        //     target.src = '/fallback-image.jpg';
                                                        // }}
                                                        // loading="lazy"
                                                    />
                                                </div>
                                            </div>
                                            {/* Column 2: Content */}
                                            <div className="flex flex-col justify-center">
                                                <h3 className="text-sm font-semibold mb-1 text-gray-800 line-clamp-2">
                                                    {formatDisplayName(product)}
                                                </h3>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-red-600 font-bold text-sm">
                                                            {formatPrice(product.discountPrice)} VND
                                                        </span>
                                                        <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                                                            -{product.discount}%
                                                        </span>
                                                    </div>
                                                    {product.originalPrice && (
                                                        <span className="text-gray-400 line-through text-xs">
                                                            {formatPrice(product.originalPrice)} VND
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
    
                {/* Main content */}
                <div id="row1" className="space-y-6">
                    {/* Title and Checkbox row */}
                    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 transition-opacity duration-300 ${isScrolled ? 'opacity-0' : 'opacity-100'}`}>
                        <div className="p-4 bg-white rounded-lg shadow-md border border-gray-200">
                            {/* Title */}
                            <h2 
                                className="text-xl font-semibold text-gray-800 mb-4"
                                dangerouslySetInnerHTML={{ 
                                    __html: getProductNames() 
                                }}
                            />
                            {/* Checkbox */}
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={showOnlyDifferences}
                                    onChange={(e) => setShowOnlyDifferences(e.target.checked)}
                                    className="w-4 h-4 mr-2 accent-blue-500"
                                />
                                <label className="text-sm text-gray-600">Chỉ xem điểm khác biệt</label>
                            </div>
                        </div>
    
                        {/* Product cards */}
                        {products.map((product) => (
                            <div key={product.id} className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 relative group hover:shadow-xl transition-all duration-300">
                                <div className="relative">
                                    {products.length > 1 && (
                                        <Button 
                                            icon="pi pi-times" 
                                            className="absolute -top-2 -right-2 p-button-rounded p-button-danger z-10 w-8 h-8 hover:scale-110 transition-transform duration-200"
                                            onClick={() => removeProduct(product.id)}
                                        />
                                    )}
                                    <Link 
                                        to={`/products/detail/${generateProductLink(product)}`}
                                        className="hover:no-underline"
                                    >
                                        <div className="flex flex-col items-center">
                                            <div className="relative w-48 h-48 mb-4 group">
                                                <img 
                                                    src={getImageUrl(product)}
                                                    alt={product.name}
                                                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                                                    // onError={(e) => {
                                                    //     const target = e.target as HTMLImageElement;
                                                    //     target.onerror = null;
                                                    //     target.src = '/fallback-image.jpg';
                                                    // }}
                                                    // loading="lazy"
                                                />
                                            </div>
                                            <h3 className="text-lg font-semibold text-center text-gray-800 line-clamp-2 mb-3">
                                                {formatDisplayName(product)}
                                            </h3>
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-red-600 font-bold text-xl">
                                                        {formatPrice(product.discountPrice)} VND
                                                    </span>
                                                    <span className="px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">
                                                        -{product.discount}%
                                                    </span>
                                                </div>
                                                {product.originalPrice && (
                                                    <span className="text-gray-400 line-through text-sm">
                                                        {formatPrice(product.originalPrice)} VND
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                    <Rating 
                                        // value={product.rating} 
                                        value={5}                            
                                        readOnly 
                                        stars={5} 
                                        cancel={false} 
                                        className="justify-center mt-4"
                                        pt={{
                                            onIcon: { className: 'text-yellow-400' },
                                            offIcon: { className: 'text-gray-300' }
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
    
                        {/* Add product button */}
                        {products.length < 3 && (
                            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-200">
                                <Button 
                                    label="Thêm sản phẩm" 
                                    icon="pi pi-plus"
                                    iconPos="left"
                                    className="w-full h-full px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors duration-200"
                                    onClick={() => {
                                        setActiveSlot(products.length);
                                        setShowDialog(true);
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </>
        );
    };

    const filteredProducts = Object.values(productDatabase).flat().filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const {  fetchCart } = useCart();

    const handleAddToCart = async (product: Product) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                toast.current?.show({
                    severity: 'error',
                    summary: 'Lỗi',
                    detail: 'Vui lòng đăng nhập để thêm vào giỏ hàng'
                });
                return;
            }
    
            const formattedName = formatDisplayName(product);
            
            // Call API with formatted name
            const response = await axios.post(
                `${API_URL}/cart/add`,
                {
                    productId: product.id,
                    quantity: 1,
                    formattedName
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
    
            if (response.data.success) {
                // Refresh cart data after adding item
                await fetchCart();
                
                toast.current?.show({
                    severity: 'success',
                    summary: 'Thành công',
                    detail: 'Đã thêm sản phẩm vào giỏ hàng'
                });
            }
        } catch (error: any) {
            toast.current?.show({
                severity: 'error',
                summary: 'Lỗi',
                detail: error.response?.data?.message || 'Không thể thêm vào giỏ hàng'
            });
        }
    };

    const handleBuyNow = async (product: Product) => {
        try {
            await handleAddToCart(product);
            navigate('/cart');
        } catch (error) {
            // Error is already handled in handleAddToCart
        }
    };

    const hasDifferences = (specKey: keyof Product['specs']): boolean => {
        if (products.length < 2) return false;
        const firstValue = products[0].specs[specKey];
        return products.some(p => p.specs[specKey] !== firstValue);
    };

    const hasAnyDifferencesInGroup = (specs: string[]): boolean => {
        if (products.length < 2) return false;
        return specs.some(spec => hasDifferences(spec as keyof Product['specs']));
    };

    const getImageUrl = (product: Product): string => {
        // Debug logs
        console.log('GetImageUrl Input:', {
            id: product.id,
            name: product.name,
            images: product.images,
            trademark: product.trademark
        });
    
        if (!product.images || !product.images.length) {
            console.warn('No images found for:', product.name);
            return '/fallback-image.jpg';
        }
    
        const baseUrl = API_URL.replace('/api', '');
        let imagePath = product.images[0];
    
        // Clean up image path to avoid duplicate segments
        if (imagePath.startsWith('/images/')) {
            // Image path already includes the base path
            console.log('Using existing image path:', baseUrl + imagePath);
            return baseUrl + imagePath;
        }

        const trademark = product.trademark
    
        const formattedTrademark = trademark.toUpperCase();
        // Otherwise construct the full path
        // const formattedTrademark = product.trademark?.toUpperCase() || 'UNKNOWN';
        const formattedName = product.baseProductName?.replace(/\s+/g, '') || '';
        const fullPath = `/images/phone/${formattedTrademark}/${formattedName}/${imagePath}`;
        
        console.log('Constructed image path:', {
            baseUrl,
            formattedTrademark,
            formattedName,
            imagePath,
            fullPath
        });
    
        return baseUrl + fullPath;
    };

    const generateProductLink = (product: Product): string => {
        const baseName = product.baseProductName
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
        
        const isIphone = baseName.includes('iphone');
        
        if (isIphone) {
          return `${baseName}-${product.variant?.storage?.toLowerCase()}`;
        } else {
          const ram = product.variant?.ram?.toLowerCase().replace(/\s+/g, '');
          const storage = product.variant?.storage?.toLowerCase().replace(/\s+/g, '');
          return `${baseName}-${ram}-${storage}`;
        }
      };

    return (        
        <div className="p-4 bg-gray-50 min-h-screen">
            <Helmet>
                <title>So sánh sản phẩm</title>
                <link rel="icon" href={`${import.meta.env.VITE_IMAGE_URL}/images/favicon/phone.ico`} />
            </Helmet>
            <Toast ref={toast} className="z-50"/>
            <div className="flex flex-col gap-8">
                {/* Row 1: Title and Product Cards */}
                {renderProductCards()}                
                {/* {renderSpecifications()} */}
                {/* Row 2: Configuration & Memory */}
                {(!showOnlyDifferences || hasAnyDifferencesInGroup(['os', 'cpu', 'gpu', 'ram', 'storage'])) && (
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                        <div className="col-span-4">
                            <Accordion multiple activeIndex={activeIndexes} className="border-none">
                                <AccordionTab header="Cấu hình & Bộ nhớ">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className="p-4">
                                            <ul className="list-none p-0 m-0">
                                                {Object.entries(products[0]?.specs || {})
                                                    .filter(([key]) => ['os', 'cpu', 'gpu', 'ram', 'storage'].includes(key))
                                                    .map(([key, _], _index) => (
                                                        (!showOnlyDifferences || hasDifferences(key as keyof Product['specs'])) && (
                                                            <li key={key} className="mb-6 pb-2 border-b border-gray-200">
                                                                {key === 'os' && 'Hệ điều hành'}
                                                                {key === 'cpu' && 'Chip xử lí (CPU)'}
                                                                {key === 'gpu' && 'Chip đồ họa (GPU)'}
                                                                {key === 'ram' && 'RAM'}
                                                                {key === 'storage' && 'Bộ nhớ'}
                                                            </li>
                                                        )
                                                ))}
                                            </ul>
                                        </div>
                                        {products.map((product) => (
                                            <div key={product.id} className="flex flex-col gap-4 p-4">
                                                {Object.entries(product.specs)
                                                    .filter(([key]) => ['os', 'cpu', 'gpu', 'ram', 'storage'].includes(key))
                                                    .map(([key, value]) => (
                                                        (!showOnlyDifferences || hasDifferences(key as keyof Product['specs'])) && (
                                                            <div key={key} className="mb-2 pb-2 border-b border-gray-200">
                                                                {value}
                                                            </div>
                                                        )
                                                ))}
                                            </div>
                                        ))}
                                        <div className="flex flex-col gap-4 p-4">
                                            {/* Empty column for potential third product */}
                                        </div>
                                    </div>
                                </AccordionTab>
                            </Accordion>
                        </div>
                    </div>
                )}
                

                {/* Row 3: Camera & Display */}
                {(!showOnlyDifferences || hasAnyDifferencesInGroup(['rearCamera', 'frontCamera', 'screenTech', 'screenSize', 'refreshRate', 'brightness'])) && (
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                        <div className="col-span-4">
                            <Accordion multiple activeIndex={activeIndexes}>
                                <AccordionTab header="Camera & Màn hình">
                                    <div className="grid grid-cols-4">
                                        <div className="p-4">
                                            <ul className="list-none p-0 m-0">
                                                {Object.entries(products[0]?.specs || {})
                                                    .filter(([key]) => ['rearCamera', 'frontCamera', 'screenTech', 'screenSize', 'refreshRate', 'brightness'].includes(key))
                                                    .map(([key, _], _index) => (
                                                        (!showOnlyDifferences || hasDifferences(key as keyof Product['specs'])) && (
                                                            <li key={key} className="mb-6 pb-2 border-b border-gray-200">
                                                                {key === 'rearCamera' && 'Độ phân giải camera sau'}
                                                                {key === 'frontCamera' && 'Độ phân giải camera trước'}
                                                                {key === 'screenTech' && 'Công nghệ màn hình'}
                                                                {key === 'screenSize' && 'Kích thước màn hình'}
                                                                {key === 'refreshRate' && 'Tần số quét màn hình'}
                                                                {key === 'brightness' && 'Độ sáng tối đa'}
                                                            </li>
                                                        )
                                                ))}
                                            </ul>
                                        </div>
                                        {products.map((product) => (
                                            <div key={product.id} className="flex flex-col gap-4 p-4">
                                                {Object.entries(product.specs)
                                                    .filter(([key]) => ['rearCamera', 'frontCamera', 'screenTech', 'screenSize', 'refreshRate', 'brightness'].includes(key))
                                                    .map(([key, value]) => (
                                                        (!showOnlyDifferences || hasDifferences(key as keyof Product['specs'])) && (
                                                            <div key={key} className="mb-2 pb-2 border-b border-gray-200">
                                                                {value}
                                                            </div>
                                                        )
                                                ))}
                                            </div>
                                        ))}
                                        <div className="flex flex-col gap-4 p-4">
                                            {/* Empty column for potential third product */}
                                        </div>
                                    </div>
                                </AccordionTab>
                            </Accordion>
                        </div>
                    </div>
                )}
                
                {/* Row 4: Battery & Charging */}
                {(!showOnlyDifferences || hasAnyDifferencesInGroup(['battery', 'charging'])) && (
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                        <div className="col-span-4">
                            <Accordion multiple activeIndex={activeIndexes}>
                                <AccordionTab header="Pin & Sạc">
                                    <div className="grid grid-cols-4">
                                        <div className="p-4">
                                            <ul className="list-none p-0 m-0">
                                                {Object.entries(products[0]?.specs || {})
                                                    .filter(([key]) => ['battery', 'charging'].includes(key))
                                                    .map(([key, _], _index) => (
                                                        (!showOnlyDifferences || hasDifferences(key as keyof Product['specs'])) && (
                                                            <li key={key} className="mb-6 pb-2 border-b border-gray-200">
                                                                {key === 'battery' && 'Dung lượng pin'}
                                                                {key === 'charging' && 'Hỗ trợ sạc tối đa'}
                                                            </li>
                                                        )
                                                ))}
                                            </ul>
                                        </div>
                                        {products.map((product) => (
                                            <div key={product.id} className="flex flex-col gap-4 p-4">
                                                {Object.entries(product.specs)
                                                    .filter(([key]) => ['battery', 'charging'].includes(key))
                                                    .map(([key, value]) => (
                                                        (!showOnlyDifferences || hasDifferences(key as keyof Product['specs'])) && (
                                                            <div key={key} className="mb-2 pb-2 border-b border-gray-200">
                                                                {value}
                                                            </div>
                                                        )
                                                ))}
                                            </div>
                                        ))}
                                        <div className="flex flex-col gap-4 p-4">
                                            {/* Empty column for potential third product */}
                                        </div>
                                    </div>
                                </AccordionTab>
                            </Accordion>
                        </div>
                    </div>
                )}
                

                {/* Row 5: Purchase Actions */}
                <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
                    <div className="col-span-1">
                        <h3 className="text-xl font-semibold text-gray-800">Thao tác</h3>
                    </div>
                    {products.map((product) => (
                        <div key={product.id} className="flex flex-col gap-4">
                            <Button 
                                label="Thêm vào giỏ hàng" 
                                className="w-full px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors duration-200"
                                onClick={() => handleAddToCart(product)}
                            />
                            <Button 
                                label="Mua ngay" 
                                className="w-full px-4 py-2 bg-blue-600 text-white border border-blue-600 rounded-lg hover:bg-blue-700 hover:border-blue-700 transition-colors duration-200"
                                onClick={() => handleBuyNow(product)}
                            />
                        </div>
                    ))}
                </div>
                </div>

                <Dialog 
                    header="Thêm sản phẩm để so sánh" 
                    visible={showDialog} 
                    style={{ width: '90vw', maxWidth: '600px' }} 
                    onHide={() => {
                        setShowDialog(false);
                        setSearchTerm('');
                        setProductDatabase({});
                    }}
                >
                    <div className="flex flex-col gap-4">
                        <div className="p-inputgroup ">
                            <InputText 
                                placeholder="Tìm kiếm sản phẩm" 
                                value={searchTerm} 
                                onChange={handleSearchChange}
                                className="w-full border rounded-l-lg p-2"
                            />
                            <Button icon="pi pi-search" 
                                className="px-4 py-2 bg-white text-gray-700 border border-l-0 border-gray-300 rounded-r-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors duration-200"
                            />
                        </div>
                    </div>
                    
                    <div className="mt-4 max-h-[60vh] overflow-y-auto">
                        {isLoading ? (
                            <div className="text-center">
                                <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem' }}></i>
                                <p>Đang tìm kiếm sản phẩm...</p>
                            </div>
                        ) : searchTerm && Object.keys(productDatabase).length > 0 ? (
                            <div className="search-results">
                                {filteredProducts.map((product, index) => (
                                    <div 
                                        key={`search-${product.id}-${index}`}
                                        className="p-2 border rounded-lg flex justify-between items-center mb-2 hover:bg-gray-50 cursor-pointer"
                                        onClick={() => addProduct(product)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16">
                                                <img 
                                                    src={getImageUrl(product)}
                                                    alt={product.name}
                                                    className="w-full h-16 object-contain"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        console.error('Search result image load error:', {
                                                            product: product.name,
                                                            src: target.src
                                                        });
                                                        target.onerror = null;
                                                        target.src = '/fallback-image.jpg';
                                                    }}
                                                    loading="lazy"
                                                />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">{formatDisplayName(product)}</h3>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-red-500 font-bold">
                                                        {formatPrice(product.discountPrice)} VND
                                                    </span>
                                                    {product.discount > 0 && (
                                                        <span key={`discount-${product.id}`} className="px-2 py-1 bg-red-500 text-white text-xs rounded">
                                                            -{product.discount}%
                                                        </span>
                                                    )}
                                                </div>
                                                {product.originalPrice > product.discountPrice && (
                                                    <span key={`original-${product.id}`} className="text-gray-500 line-through text-sm">
                                                        {formatPrice(product.originalPrice)} VND
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <Button 
                                            icon="pi pi-plus"
                                            className="p-button-rounded p-button-text"
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : searchTerm ? (
                            <div className="text-center p-4">
                                <p>Không tìm thấy sản phẩm phù hợp</p>
                            </div>
                        ) : (
                            <div className="text-center p-4">
                                <p>Nhập tên sản phẩm để tìm kiếm</p>
                            </div>
                        )}
                    </div>
                </Dialog>

        </div>
        </div>
    );
};

export default UserProductsCompare;
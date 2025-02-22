import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Galleria } from 'primereact/galleria';
import { Button } from 'primereact/button';
import { Rating } from 'primereact/rating';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { FileUpload } from 'primereact/fileupload';
import { InputText } from 'primereact/inputtext';
import { Accordion, AccordionTab } from 'primereact/accordion';
import { TabMenu } from 'primereact/tabmenu';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import axios from 'axios';
import ComparisonBar from '../../components/user/ComparisonBar';
import { useCart } from './CartContext';
import { useComparison } from '../../components/user/ComparisonContext';
import { Product as ComparisonProduct, Product } from '../user/types/product';

const API_URL = 'http://localhost:3000/api';

interface UserProfile {
    full_name: string;
    phone_number: string;
    address: string;
}

interface LocationOption {
    label: string;
    value: string;
    code: string;
}

interface ProductSpecs {
    os: string;
    cpu: string;
    gpu: string;
    camera: {
        main: string;
        front: string;
    };
    display: {
        type: string;
        size: string;
        refresh_rate: string;
        brightness: string;
    };
    battery: {
        capacity: string;
        charging: string;
    };
}

interface ProductData {
    link: any;
    shippingInfo: string;
    stock: number;
    id: string;
    name: string;
    baseProductName: string;
    // images: Array<{
    //     itemImageSrc: string;
    //     thumbnailImageSrc: string;
    //     alt: string;
    // }>;
    images: string[];
    rating: {
        average: number;
        count: number;
    };
    reviews: Array<{
        name: string;
        comment: string;
        rating: number;
        created_at: string;
    }>;
    specs: {
        os: string;
        cpu: string;
        gpu: string;
        camera: {
            main: string;
            front: string;
        };
        display: {
            type: string;
            size: string;
            refresh_rate: string;
            brightness: string;
        };
        battery: {
            capacity: string;
            charging: string;
        };
    };
    memoryOptions: string[];
    ramOptions: Record<string, string> | null;
    colorOptions: string[];
    prices: Record<string, number>;
    originalPrice: number;
    discount: number;
    meta: string;
    needs: string[];
    special_features: string[];
    variant: {
        storage: string;
        ram: string;
    };
    trademark: string;
}

const UserProductDetail = () => {
    // 1. Router và Context Hooks
    const { link } = useParams();
    const navigate = useNavigate();
    const { addToCart, fetchCart } = useCart();
    // const { addProduct } = useComparison();

    // 2. Refs
    const toast = useRef<Toast>(null);
    const fileUploadRef = useRef<FileUpload>(null);

    // 3. Product States
    const [product, setProduct] = useState<ProductData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMemory, setSelectedMemory] = useState<string>('');
    const [currentPrice, setCurrentPrice] = useState<number>(0);
    const [originalPrice, setOriginalPrice] = useState<number>(0);
    const [currentSpecs, setCurrentSpecs] = useState<ProductSpecs | null>(null);
    const [availableProducts, setAvailableProducts] = useState<ComparisonProduct[]>([]);
    const [otherVersions, setOtherVersions] = useState<ProductData[]>([]);

    const { addProduct, getComparisonProducts } = useComparison();

    // 4. UI States
    const [visible, setVisible] = useState(false);
    const [showAddressDialog, setShowAddressDialog] = useState(false);
    const [activeTab, setActiveTab] = useState(0);

    // 5. Form States
    const [rating, setRating] = useState(0);
    const [review, setReview] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [uploadError, setUploadError] = useState('');
    const [showUploadError, setShowUploadError] = useState(false);

    // 6. Address States
    const [selectedProvince, setSelectedProvince] = useState<LocationOption | null>(null);
    const [selectedDistrict, setSelectedDistrict] = useState<LocationOption | null>(null);
    const [filteredDistricts, setFilteredDistricts] = useState<LocationOption[]>([]);
    const [selectedWard, setSelectedWard] = useState<LocationOption | null>(null);
    const [filteredWards, setFilteredWards] = useState<LocationOption[]>([]);
    const [streetAddress, setStreetAddress] = useState('');
    const [shippingAddress, setShippingAddress] = useState('');
    const [provinces, setProvinces] = useState<LocationOption[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

    // 7. Constants
    const addressTabs = [
        { label: 'Tỉnh/TP', icon: 'pi pi-map-marker' },
        { label: 'Quận/Huyện', icon: 'pi pi-map' },
        { label: 'Phường/Xã', icon: 'pi pi-home' }
    ];

    // 8. Effects
    useEffect(() => {
        const fetchProduct = async () => {
            if (!link) return;
            try {
                setLoading(true);
                const response = await axios.get(`${API_URL}/products/detail/${link}`);
                if (response.data.success) {
                    const productData = response.data.data;
                    console.log('Received product data:', productData); // Debug log
                    console.log('Image URLs:', productData.images); // Debug log
                    setProduct(productData);
                    if (productData.memoryOptions.length > 0) {
                        const firstMemoryOption = productData.memoryOptions[0];
                        setSelectedMemory(firstMemoryOption);
                        setCurrentPrice(productData.prices[firstMemoryOption]);
                        setOriginalPrice(productData.originalPrice);
                        setCurrentSpecs(productData.specs);
                    }
                    if (productData.userProfile) {
                        setUserProfile(productData.userProfile);
                    }
                }
            } catch (error) {
                console.error('Error fetching product:', error);
                setError('Could not load product details');
                toast.current?.show({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Could not load product details'
                });
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [link]);

    useEffect(() => {
        const fetchAvailableProducts = async () => {
            try {
                const response = await axios.get(`${API_URL}/products/hot`);
                if (response.data.success) {
                    setAvailableProducts(response.data.data);
                }
            } catch (error) {
                console.error('Error fetching available products:', error);
            }
        };
        fetchAvailableProducts();
    }, []);

    // Lấy danh sách tỉnh/thành phố từ backend
    useEffect(() => {
        const fetchProvinces = async () => {
            try {
                const response = await axios.get(`${API_URL}/provinces`);
                console.log('Raw API response:', response.data);
                
                if (response.data.success) {
                    // Không cần map lại vì API đã trả về đúng format
                    const provinceData = response.data.data;
                    console.log('Provinces data:', provinceData);
                    setProvinces(provinceData);
                }
            } catch (error) {
                console.error('Error fetching provinces:', error);
                toast.current?.show({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Không thể tải danh sách tỉnh/thành phố'
                });
            }
        };
        fetchProvinces();
    }, []);

    // Lấy danh sách quận/huyện dựa trên tỉnh/thành phố đã chọn
    useEffect(() => {
        if (selectedProvince?.code) {
            const fetchDistricts = async () => {
                try {
                    console.log('Fetching districts for province code:', selectedProvince.code);
                    const response = await axios.get(`${API_URL}/districts/${selectedProvince.code}`);
                    console.log('Districts API response:', response.data);
        
                    if (response.data.success) {
                        // Sử dụng trực tiếp data từ API
                        setFilteredDistricts(response.data.data);
                    }
                } catch (error) {
                    console.error('Error fetching districts:', error);
                    if (axios.isAxiosError(error)) {
                        console.error('Axios error details:', error.response?.data);
                    }
                }
            };
            fetchDistricts();
        } else {
            console.log('No province selected, clearing districts');
            setFilteredDistricts([]);
        }
    }, [selectedProvince]);

    // Lấy danh sách phường/xã dựa trên quận/huyện đã chọn
    useEffect(() => {
        if (selectedDistrict?.code) {
            const fetchWards = async () => {
                try {
                    const districtCode = selectedDistrict.code.toUpperCase();
                    console.log('Fetching wards for district:', {
                        code: districtCode,
                        name: selectedDistrict.label
                    });
                    
                    const response = await axios.get(`${API_URL}/wards/${districtCode}`);
                    console.log('Raw wards response:', response.data);
        
                    if (response.data.success) {
                        // Sử dụng trực tiếp data từ API
                        setFilteredWards(response.data.data);
                    } else {
                        console.error('Wards API error:', response.data.message);
                        toast.current?.show({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'Không thể tải danh sách phường/xã'
                        });
                    }
                } catch (error) {
                    console.error('Error fetching wards:', error);
                    if (axios.isAxiosError(error)) {
                        console.error('API error response:', error.response?.data);
                    }
                    setFilteredWards([]);
                    toast.current?.show({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Không thể tải danh sách phường/xã'
                    });
                }
            };
            fetchWards();
        } else {
            setFilteredWards([]);
        }
    }, [selectedDistrict]);

    useEffect(() => {
        const fetchOtherVersions = async () => {
            if (!product) return;
            try {
                const response = await axios.get(`${API_URL}/products?name=${product.baseProductName}`);
                if (response.data.success) {
                    setOtherVersions(response.data.data);
                } else {
                    console.error('Failed to fetch other versions:', response.data.message);
                }
            } catch (error) {
                console.error('Error fetching other versions:', error);
            }
        };
        fetchOtherVersions();
    }, [product]);

    const fetchUserProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            const userId = localStorage.getItem('userId');
            
            if (!token || !userId) {
                console.log('No token or userId found');
                return;
            }
    
            console.log('Fetching profile for userId:', userId);
            const response = await axios.get(
                `${API_URL}/users/profile/${userId}`,
                {
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
    
            console.log('Profile response:', response.data);
            if (response.data.success) {
                setUserProfile(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Không thể tải thông tin người dùng'
            });
        }
    };

    useEffect(() => {
        fetchUserProfile();
    }, []);

    // Loading and error states
    if (loading) {
        return <div className="flex justify-center items-center h-screen">
            <i className="pi pi-spinner pi-spin" style={{ fontSize: '2rem' }}></i>
        </div>;
    }

    if (error || !product) {
        return <div className="flex justify-center items-center h-screen text-red-500">
            {error || 'Product not found'}
        </div>;
    }

    // Handlers
    const handleAddToComparison = (product: Product) => {
        try {
          const currentProducts = getComparisonProducts();
          
          if (currentProducts.length >= 3) {
            toast.current?.show({
              severity: 'warn',
              summary: 'Giới hạn so sánh',
              detail: 'Chỉ có thể so sánh tối đa 3 sản phẩm',
              life: 3000
            });
            return;
          }
      
          if (currentProducts.some(p => p.id === product.id)) {
            toast.current?.show({
              severity: 'warn',
              summary: 'Đã tồn tại',
              detail: 'Sản phẩm này đã có trong danh sách so sánh',
              life: 3000
            });
            return;
          }
      
          addProduct(product);
          
          toast.current?.show({
            severity: 'success',
            summary: 'Thêm thành công',
            detail: 'Sản phẩm đã được thêm vào danh sách so sánh',
            life: 3000
          });
        } catch (error) {
          console.error('Error adding to comparison:', error);
          toast.current?.show({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể thêm sản phẩm vào danh sách so sánh',
            life: 3000
          });
        }
      };

    const getColorStyle = (color: string) => {
        switch (color.toLowerCase()) {
            case 'đen':
                return 'bg-black text-white border';
            case 'trắng':
                return 'bg-white text-black border';
            case 'xanh':
                return 'bg-blue-500 text-black border';
            default:
                return `bg-${color.toLowerCase()}-500 text-black border`;
        }
    };

    const getFormattedProductName = () => {
        if (!product) return '';
        if (product.baseProductName.toLowerCase().includes('iphone')) {
            return `${product.baseProductName} ${selectedMemory}`;
        } else if (product.ramOptions) {
            return `${product.baseProductName} ${product.ramOptions[selectedMemory]}/${selectedMemory}`;
        } else {
            return `${product.baseProductName} ${selectedMemory}`;
        }
    };

    const handleAddToCart = async (product: ProductData) => {
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
    
            const formattedName = getFormattedProductName();
            
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
            navigate('/cart', { state: { scrollToTop: true } });
        } catch (error) {
            // Error is already handled in handleAddToCart
        }
    };

    const handleConfirmAddress = async () => {
        if (!selectedProvince || !selectedDistrict || !selectedWard || !streetAddress) {
            return;
        }
        
        try {
            const token = localStorage.getItem('token');
            const userId = localStorage.getItem('userId');
            
            if (!token || !userId) {
                toast.current?.show({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Vui lòng đăng nhập để cập nhật địa chỉ'
                });
                return;
            }
    
            const newAddress = `${streetAddress}, ${selectedWard.label}, ${selectedDistrict.label}, ${selectedProvince.label}`;
            
            // Call API to update user profile address
            await axios.put(
                `${API_URL}/users/profile/${userId}/address`,
                { address: newAddress },
                {
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
    
            // Fetch updated profile
            await fetchUserProfile();
            
            setShippingAddress(newAddress);
            setShowAddressDialog(false);
            
            // Reset form
            setStreetAddress('');
            setSelectedWard(null);
            setSelectedDistrict(null);
            setSelectedProvince(null);
            setActiveTab(0);
    
            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: 'Đã cập nhật địa chỉ thành công'
            });
        } catch (error) {
            console.error('Error updating address:', error);
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Không thể cập nhật địa chỉ'
            });
        }
    };

    const handleMemorySelect = (storage: string) => {
        const selectedVersion = otherVersions.find(version => version.variant.storage === storage);
        if (selectedVersion) {
            setSelectedMemory(storage);
            setCurrentPrice(selectedVersion.prices[storage]);
            setOriginalPrice(selectedVersion.originalPrice);
            setCurrentSpecs(selectedVersion.specs);
            navigate(`/products/detail/${selectedVersion.link}`);
        }
    };

    const handleSubmitReview = () => {
        if (files.length > 3) {
            setUploadError('Chỉ được upload tối đa 3 ảnh');
            setShowUploadError(true);
            if (fileUploadRef.current) {
                fileUploadRef.current.clear(); // Clear all files
            }
            return;
        }
        // Submit review logic
        setVisible(false);
    };

    const handleFileSelect = (e: { files: File[] }) => {
        setFiles(e.files);
    };

    const itemTemplate = (imageUrl: string) => {
        return (
            <div className="flex justify-center">
                <img 
                    src={`${API_URL.replace('/api', '')}${imageUrl}`} // Loại bỏ /api từ URL
                    alt={product?.name || 'Product image'} 
                    className="w-full max-w-[500px] object-contain"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        console.error('Image load error:', imageUrl);
                        target.src = '/fallback-image.jpg';
                    }}
                />
            </div>
        );
    };

    const thumbnailTemplate = (imageUrl: string) => {
        return (
            <img 
                src={`${API_URL.replace('/api', '')}${imageUrl}`} // Loại bỏ /api từ URL
                alt={product?.name || 'Product thumbnail'} 
                className="w-20 h-20 object-cover"
                onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/fallback-image.jpg';
                }}
            />
        );
    };

    function convertToComparisonProduct(productData: ProductData): Product {
        // Debug log trước khi convert
        console.log('Converting product data:', {
            id: productData.id,
            name: productData.name,
            baseProductName: productData.baseProductName,
            trademark: productData.trademark,
            originalImages: productData.images
        });

        let formattedImages = productData.images;
        if (productData.trademark && productData.baseProductName) {
            formattedImages = productData.images.map(image => {
                if (image.startsWith('/images/phone/')) {
                    return image;
                }
                return `/images/phone/${productData.trademark.toUpperCase()}/${productData.baseProductName.replace(/\s+/g, '')}/${image}`;
            });
        }

        console.log('Formatted images:', formattedImages);
    
        // Format product data for comparison
        const convertedProduct = {
            id: productData.id,
            name: productData.name,
            baseProductName: productData.baseProductName,
            price: currentPrice,
            images: productData.images,
            trademark: productData.trademark,
            originalPrice: productData.originalPrice,
            discountPrice: currentPrice,
            discount: productData.discount,
            rating: {
                average: productData.rating?.average || 0,
                count: productData.rating?.count || 0
            },
            meta: productData.meta,
            link: productData.link,
            specs: productData.specs,
            variant: {
                storage: productData.variant.storage,
                ram: productData.variant.ram
            },
            needs: productData.needs,
            special_features: productData.special_features,
            color_options: productData.colorOptions
        };
    
        // Debug log sau khi convert
        console.log('Converted product:', {
            id: convertedProduct.id,
            name: convertedProduct.name,
            trademark: convertedProduct.trademark,
            images: convertedProduct.images
        });
    
        return convertedProduct;
    }

    // Calculate average rating
    const averageRating = product.reviews.length
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
        : 0;

    // Calculate rating percentages
    const totalReviews = product.reviews.length;
    const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
        star,
        count: product.reviews.filter(review => review.rating === star).length,
        percentage: totalReviews ? (product.reviews.filter(review => review.rating === star).length / totalReviews) * 100 : 0,
    }));

    const ReviewSection = () => {
        const [reviewData, setReviewData] = useState({
            reviews: [],
            stats: {
                1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
                total: 0,
                average: 0
            }
        });

        useEffect(() => {
            fetchReviews();
        }, []);

        const fetchReviews = async () => {
            try {
                const response = await axios.get(`${API_URL}/reviews/product/${product.id}`);
                if (response.data.success) {
                    setReviewData(response.data.data);
                }
            } catch (error) {
                console.error('Error fetching reviews:', error);
            }
        };

        return (
            <div className="mt-8 bg-white p-6 rounded-lg shadow">
                <h3 className="text-2xl font-semibold mb-6">Đánh giá sản phẩm</h3>
                
                {/* Rating Overview */}
                <div className="flex items-start gap-8 mb-8 p-4 bg-gray-50 rounded-lg">
                    {/* Average Rating */}
                    <div className="text-center w-48">
                        <div className="text-4xl font-bold text-yellow-500">
                            {reviewData.stats.average ? reviewData.stats.average.toFixed(1) : '0.0'}
                        </div>
                        <Rating 
                            value={reviewData.stats.average} 
                            readOnly 
                            cancel={false}
                            className="my-2"
                        />
                        <div className="text-gray-600">
                            {reviewData.stats.total} đánh giá
                        </div>
                    </div>

                    {/* Rating Distribution */}
                    <div className="flex-1">
                        {[5, 4, 3, 2, 1].map(star => (
                            <div key={star} className="flex items-center gap-2 mb-2">
                                <span className="w-12 text-sm">{star} sao</span>
                                <div className="flex-1 h-2 bg-gray-200 rounded overflow-hidden">
                                    <div 
                                        className="h-full bg-yellow-400"
                                        style={{
                                            width: `${(reviewData.stats[star]/reviewData.stats.total)*100 || 0}%`
                                        }}
                                    />
                                </div>
                                <span className="w-12 text-sm text-right">
                                    {reviewData.stats[star]}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 w-48">
                        <Button 
                            label="Viết đánh giá" 
                            icon="pi pi-pencil" 
                            onClick={() => setVisible(true)}
                            className="p-button-primary w-full"
                        />
                        <Button 
                            label="Xem tất cả" 
                            icon="pi pi-list" 
                            onClick={() => navigate(`/products/${product.id}/reviews`)}
                            className="p-button-secondary w-full"
                        />
                    </div>
                </div>

                {/* Latest Reviews */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-lg mb-4">Đánh giá gần đây</h4>
                    {reviewData.reviews.map((review) => (
                        <div key={review._id} className="border-b pb-4 last:border-0">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="font-semibold">{review.user_id.name}</div>
                                    <Rating value={review.rating} readOnly cancel={false} />
                                </div>
                                <div className="text-gray-500 text-sm">
                                    {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                                </div>
                            </div>
                            <p className="text-gray-700 mb-2">{review.comment}</p>
                            {/* Rest of the review item remains the same */}
                        </div>
                    ))}
                </div>

                {/* Show more button */}
                {reviewData.length > 2 && (
                    <div className="text-center mt-6">
                        <Button
                            label="Xem tất cả đánh giá"
                            icon="pi pi-arrow-right"
                            className="p-button-text"
                            onClick={() => navigate(`/products/${product.id}/reviews`)}
                        />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="p-4">
            <Toast ref={toast} />
            {/* Row 1 */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                <h1 className="text-2xl font-bold">{getFormattedProductName()}</h1>
                <Button 
                    label="So sánh" 
                    icon="pi pi-exchange" 
                    className="p-button-info ml-4 border p-1 bg-white" 
                    onClick={() => handleAddToComparison(convertToComparisonProduct(product))}
                />
                </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-3 gap-4">
                {/* Column 1 */}
                <div className="col-span-2">
                <Galleria 
                    value={product.images} // Now directly using the images array
                    responsiveOptions={[
                        {
                            breakpoint: '1024px',
                            numVisible: 5
                        },
                        {
                            breakpoint: '768px',
                            numVisible: 3
                        },
                        {
                            breakpoint: '560px',
                            numVisible: 1
                        }
                    ]} 
                    numVisible={5} 
                    circular 
                    style={{ maxWidth: '640px' }}
                    containerStyle={{ marginBottom: '0' }}
                    showItemNavigators
                    showThumbnails
                    showIndicators
                    item={itemTemplate} 
                    thumbnail={thumbnailTemplate}
                    className="custom-galleria" 
                />
                <div className="mt-4">
                    <h2 className="text-xl font-bold mb-2">Thông số kỹ thuật</h2>
                    <Accordion multiple activeIndex={[0, 1, 2]}>
                        <AccordionTab header="Cấu hình & Bộ nhớ">
                            <ul>
                                <li className="mb-1 flex">
                                    <strong className="w-1/3">Hệ điều hành:</strong>
                                    <span className="ml-4">{product?.specs.os}</span>
                                </li>
                                <li className="mb-1 flex">
                                    <strong className="w-1/3">Chip xử lí (CPU):</strong>
                                    <span className="ml-4">{product?.specs.cpu}</span>
                                </li>
                                <li className="mb-1 flex">
                                    <strong className="w-1/3">Chip đồ họa (GPU):</strong>
                                    <span className="ml-4">{product?.specs.gpu}</span>
                                </li>
                                <li className="mb-1 flex">
                                    <strong className="w-1/3">RAM:</strong>
                                    <span className="ml-4">
                                        {product?.ramOptions 
                                            ? product.ramOptions[selectedMemory] 
                                            : product?.variant.ram 
                                                ? product.variant.ram 
                                                : 'Không có thông tin'
                                        }
                                    </span>
                                </li>
                                <li className="mb-1 flex">
                                    <strong className="w-1/3">Bộ nhớ:</strong>
                                    <span className="ml-4">{selectedMemory}</span>
                                </li>
                            </ul>
                        </AccordionTab>

                        <AccordionTab header="Camera & Màn hình">
                            <ul>
                                <li className="mb-1 flex">
                                <strong className="w-1/3">Độ phân giải camera sau:</strong>
                                <span className="ml-4">{product?.specs?.camera?.main || ''}</span>
                                </li>
                                <li className="mb-1 flex">
                                <strong className="w-1/3">Độ phân giải camera trước:</strong>
                                <span className="ml-4">{product?.specs?.camera?.front || ''}</span>
                                </li>
                                <li className="mb-1 flex">
                                <strong className="w-1/3">Công nghệ màn hình:</strong>
                                <span className="ml-4">{product?.specs?.display?.type || ''}</span>
                                </li>
                                <li className="mb-1 flex">
                                <strong className="w-1/3">Kích thước màn hình:</strong>
                                <span className="ml-4">{product?.specs?.display?.size || ''}</span>
                                </li>
                                <li className="mb-1 flex">
                                <strong className="w-1/3">Tần số quét màn hình:</strong>
                                <span className="ml-4">{product?.specs?.display?.refresh_rate || ''}</span>
                                </li>
                                <li className="mb-1 flex">
                                <strong className="w-1/3">Độ sáng tối đa:</strong>
                                <span className="ml-4">{product?.specs?.display?.brightness || ''}</span>
                                </li>
                            </ul>
                        </AccordionTab>

                        <AccordionTab header="Pin & Sạc">
                            <ul>
                                <li className="mb-1 flex">
                                <strong className="w-1/3">Dung lượng pin:</strong>
                                <span className="ml-4">{product?.specs?.battery?.capacity || ''}</span>
                                </li>
                                <li className="mb-1 flex">
                                <strong className="w-1/3">Hỗ trợ sạc tối đa:</strong>
                                <span className="ml-4">{product?.specs?.battery?.charging || ''}</span>
                                </li>
                            </ul>
                        </AccordionTab>
                    </Accordion>
                </div>

                {/* <div className="mt-4">
                    <h2 className="text-xl font-bold mb-2">Đánh giá</h2>
                    <div className="flex flex-col items-center">
                        <Rating value={product?.rating.average || 0} readOnly stars={5} cancel={false} />
                        <span className="mt-2">{product?.rating.average.toFixed(1)}/5</span>
                        <span className="mt-2">{product?.rating.count} khách hàng đã đánh giá</span>
                    </div>
                    <div className="mt-4">
                        {product?.reviews.map((review, index) => (
                        <div key={index} className="mb-4 pb-4 border-b border-gray-200">
                            <strong>{review.name}</strong>
                            <Rating value={review.rating} readOnly stars={5} cancel={false} className="ml-2" />
                            <p>{review.comment}</p>
                            <span className="text-sm text-gray-500">
                            {new Date(review.created_at).toLocaleDateString()}
                            </span>
                        </div>
                        ))}
                    </div>
                </div> */}

                <ReviewSection />
                </div>

                {/* Column 2 */}
                <div className="col-span-1 border bg-white p-4 rounded-lg">
                <div className="mb-4">
                    <h2 className="text-xl font-bold mb-2">Tùy chọn phiên bản</h2>
                    <div className="flex gap-2">
                        {otherVersions.map((version) => (
                            <Button 
                                key={version.id}
                                label={product.baseProductName.toLowerCase().includes('iphone') 
                                    ? version.variant.storage 
                                    : `${version.variant.ram}-${version.variant.storage}`
                                }
                                className={`p-button-outlined w-full bg-white border p-2 ${selectedMemory === version.variant.storage ? 'p-button-primary' : ''}`}
                                onClick={() => handleMemorySelect(version.variant.storage)}
                            />
                        ))}
                    </div>
                </div>
                <div className="mb-4">
                <h2 className="text-xl font-bold mb-2">Tùy chọn màu sắc</h2>
                    <div className="flex gap-2">
                    {product.colorOptions.map((color, index) => (
                        <Button 
                        key={index} 
                        label={color} 
                        className={`p-button-outlined w-full p-2 ${getColorStyle(color)}`}
                        />
                    ))}
                    </div>
                </div>
                <div className="mb-4">
                    <h2 className="text-xl font-bold mb-2">Giá sản phẩm</h2>
                    <div className="flex gap-2 items-center">
                        <div className="text-red-500 font-bold text-2xl">
                            {currentPrice.toLocaleString()} VND
                        </div>
                        <div className="text-gray-500 line-through">
                            {originalPrice.toLocaleString()} VND
                        </div>
                        <div className="text-green-500">
                            {Math.round(((originalPrice - currentPrice) / originalPrice) * 100)}% OFF
                        </div>
                    </div>
                </div>
                <div>
                    <p className={`mt-2 mb-4 ${product.stock > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {product.stock > 0 ? 'Còn hàng' : 'Hết hàng'}
                    </p>
                </div>
                <div className="mb-4 border p-2 bg-gray-100 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-xl font-bold">Thông tin vận chuyển</h2>
                        <Button 
                            label={userProfile?.address ? "Thay đổi" : "Thêm địa chỉ"} 
                            className="p-button-text" 
                            onClick={() => {
                                if (!localStorage.getItem('token')) {
                                    toast.current?.show({
                                        severity: 'warn',
                                        summary: 'Warning',
                                        detail: 'Vui lòng đăng nhập để thêm địa chỉ'
                                    });
                                    return;
                                }
                                setShowAddressDialog(true);
                            }}
                        />
                    </div>
                    {userProfile ? (
                        <div className="p-2 border rounded bg-white">
                            <p className="font-semibold">{userProfile.full_name}</p>
                            <p className="text-gray-600">{userProfile.phone_number}</p>
                            <p className="text-gray-600">{userProfile.address}</p>
                        </div>
                    ) : (
                        <p className="text-gray-500">
                            {localStorage.getItem('token') 
                                ? "Đang tải thông tin..." 
                                : "Vui lòng đăng nhập để thêm địa chỉ nhận hàng"}
                        </p>
                    )}
                </div>           
                {product.stock > 0 && (
                    <div className="flex gap-2">
                        <Button 
                            label="Thêm vào giỏ hàng" 
                            className="p-button-secondary w-full border p-2" 
                            onClick={() => handleAddToCart(product)} // Truyền product hiện tại
                        />
                        <Button 
                            label="Mua ngay" 
                            className="p-button-primary w-full border p-2" 
                            onClick={() => handleBuyNow(product)} 
                        />
                    </div>
                )}
                </div>
            </div>

            {/* Review Dialog */}
            <Dialog header="Viết đánh giá" visible={visible} style={{ width: '50vw' }} onHide={() => setVisible(false)}>
                <div className="flex flex-col gap-4">
                    <Rating value={rating} onChange={(e) => setRating(e.value ?? 0)} stars={5} cancel={false} className='justify-center'/>
                    <InputTextarea 
                        value={review} 
                        onChange={(e) => setReview(e.target.value)} 
                        rows={5} 
                        placeholder="Chia sẻ cảm nhận của bạn..." 
                        className='border'
                    />
                    
                    {showUploadError && (
                        <div className="p-3 bg-red-100 text-red-700 rounded">
                            {uploadError}
                        </div>
                    )}
                    
                    <label className="font-bold mb-2">Gửi ảnh thực tế (Tối đa 3 ảnh)</label>
                    <FileUpload
                        ref={fileUploadRef}
                        mode="advanced"
                        name="demo[]" 
                        url="./upload"
                        accept="image/*"
                        maxFileSize={1000000}
                        multiple
                        auto={false}
                        customUpload
                        chooseLabel="Chọn ảnh"
                        cancelLabel="Hủy"
                        onSelect={handleFileSelect}
                        uploadHandler={handleSubmitReview}
                        uploadOptions={{ style: { display: 'none' } }}
                    />
                    <InputText value={name} onChange={(e) => setName(e.target.value)} placeholder="Họ và tên" required className='border p-2'/>
                    <InputText 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value.replace(/\D/, ''))} 
                        placeholder="Số điện thoại" 
                        required 
                        type="tel" 
                        pattern="[0-9]*" 
                        inputMode="numeric"
                        className='border p-2'
                    />
                    <Button label="Gửi đánh giá" className="p-button-primary border p-2" onClick={handleSubmitReview} disabled={!name || !phone || !rating} />
                </div>
            </Dialog>

            {/* Address Dialog */}
            <Dialog 
                header="Chọn địa chỉ nhận hàng" 
                visible={showAddressDialog} 
                style={{ width: '50vw' }} 
                onHide={() => setShowAddressDialog(false)}
            >
                <div className="flex flex-col gap-4">
                    <TabMenu 
                        model={addressTabs} 
                        activeIndex={activeTab} 
                        onTabChange={(e) => setActiveTab(e.index)} 
                        className=''
                    />
                    
                    {activeTab === 0 && (
                        <>
                            <Dropdown 
                                value={selectedProvince?.code}
                                options={provinces}
                                onChange={(e) => {
                                    console.log('Selected province code:', e.value);
                                    const selectedProv = provinces.find(p => p.code === e.value);
                                    console.log('Found province:', selectedProv);
                                    
                                    if (selectedProv) {
                                        setSelectedProvince(selectedProv); // Lưu trực tiếp object từ API
                                        setSelectedDistrict(null);
                                        setSelectedWard(null);
                                        setActiveTab(1);
                                    }
                                }}
                                optionLabel="label"
                                optionValue="code"
                                placeholder="Chọn Tỉnh/Thành phố"
                                className="w-full border"
                            />
                        </>
                    )}

                    {activeTab === 1 && (
                        <>
                            <Dropdown 
                                value={selectedDistrict?.code}
                                options={filteredDistricts}
                                onChange={(e) => {
                                    console.log('Selected district code:', e.value);
                                    const selectedDist = filteredDistricts.find(d => d.code === e.value);
                                    console.log('Found district object:', selectedDist);
                                    
                                    if (selectedDist) {
                                        setSelectedDistrict({
                                            ...selectedDist,
                                            code: selectedDist.code
                                        });
                                        setSelectedWard(null);
                                        setActiveTab(2);
                                    }
                                }}
                                optionLabel="label"
                                optionValue="code"
                                placeholder="Chọn Quận/Huyện"
                                className="w-full border"
                                disabled={!selectedProvince}
                            />
                        </>
                    )}

                    {activeTab === 2 && (
                        <>
                            <Dropdown 
                                value={selectedWard?.code}
                                options={filteredWards}
                                onChange={(e) => {
                                    console.log('Selected ward code:', e.value);
                                    const selectedW = filteredWards.find(w => w.code === e.value);
                                    console.log('Found ward object:', selectedW);
                                    
                                    if (selectedW) {
                                        setSelectedWard({
                                            label: selectedW.label,
                                            value: selectedW.code,
                                            code: selectedW.code
                                        });
                                    }
                                }}
                                optionLabel="label"
                                optionValue="code"
                                placeholder="Chọn Phường/Xã"
                                className="w-full border mb-2"
                                disabled={!selectedDistrict}
                            />
                            
                            {filteredWards.length === 0 && selectedDistrict && (
                                <div className="text-yellow-600 text-sm mb-2">
                                    Không tìm thấy dữ liệu phường/xã cho quận/huyện này
                                </div>
                            )}
                            
                            <InputText 
                                value={streetAddress}
                                onChange={(e) => setStreetAddress(e.target.value)}
                                placeholder="Nhập số nhà, tên đường"
                                className="w-full border p-2"
                            />
                        </>
                    )}
                    
                    <Button 
                        label="Xác nhận địa chỉ" 
                        className="p-button-primary border p-2" 
                        onClick={handleConfirmAddress}
                        disabled={!selectedWard || !streetAddress.trim()}
                    />
                </div>
            </Dialog>

            <ComparisonBar availableProducts={availableProducts} />
        </div>  
    );
};

export default UserProductDetail;
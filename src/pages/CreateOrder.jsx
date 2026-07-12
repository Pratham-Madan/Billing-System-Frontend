import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getCustomers, getCategories, getCustomerProductsWithPrices, getAdminProductsWithPrices } from '../api';

function CreateOrder() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    initializeData();
  }, [navigate]);

  const initializeData = async () => {
    try {
      const customersData = await getCustomers();
      setBuyers(customersData.map(c => ({
        id: c.id,
        name: c.partyName,
        city: c.billingAddress?.split(',')[0] || '',
        discount: 0
      })));

      const categoriesData = await getCategories();
      setCategories(categoriesData);
      if (categoriesData.length > 0 && selectedCategory === 'Taps') {
        setSelectedCategory(categoriesData[0].name);
        setFlashCategory(categoriesData[0].name);
      }
    } catch (err) {
      console.error('Error initializing data:', err);
    }
  };

  const [showBuyerModal, setShowBuyerModal] = useState(true);
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [showFlashOrder, setShowFlashOrder] = useState(false);
  const [cart, setCart] = useState(() => {
    const saved = sessionStorage.getItem('orderCart');
    return saved ? JSON.parse(saved) : {};
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Taps');
  const [flashCategory, setFlashCategory] = useState('Taps');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [buyers, setBuyers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productsMap, setProductsMap] = useState({});

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        let prods = [];
        if (selectedBuyer) {
          prods = await getCustomerProductsWithPrices(selectedBuyer.id);
        } else {
          prods = await getAdminProductsWithPrices();
        }
        
        // Group by categoryId
        const grouped = {};
        categories.forEach(c => grouped[c.name] = []);
        
        prods.forEach(p => {
          const cat = categories.find(c => c.id === p.categoryId);
          const catName = cat ? cat.name : 'Uncategorized';
          if (!grouped[catName]) grouped[catName] = [];
          
          grouped[catName].push({
            id: p.id,
            name: p.name,
            model: p.modelNumber || '',
            price: (p.basePrice || 0).toFixed(2),
            originalPrice: p.basePrice,
            stock: p.stock || 0,
            image: p.imageUrl || ''
          });
        });
        
        setProductsMap(grouped);
      } catch (err) {
        console.error("Error fetching catalog", err);
      }
    };
    
    if (categories.length > 0) {
      fetchCatalog();
    }
  }, [selectedBuyer, categories]);

  const currentProducts = productsMap[selectedCategory] || [];
  const flashProducts = productsMap[flashCategory] || [];

  // Save cart and buyer to session storage
  useEffect(() => {
    sessionStorage.setItem('orderCart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (selectedBuyer) {
      sessionStorage.setItem('selectedBuyer', JSON.stringify(selectedBuyer));
    }
  }, [selectedBuyer]);

  // Cart functions
  const addToCart = (product, quantity) => {
    const qty = parseInt(quantity) || 1;
    const updatedCart = { ...cart };
    
    if (updatedCart[product.id]) {
      updatedCart[product.id] = {
        ...updatedCart[product.id],
        quantity: updatedCart[product.id].quantity + qty
      };
    } else {
      updatedCart[product.id] = {
        ...product,
        quantity: qty,
        category: selectedCategory
      };
    }
    
    setCart(updatedCart);
  };

  const updateCartQuantity = (productId, quantity) => {
    const qty = parseInt(quantity);
    if (qty <= 0) {
      const newCart = { ...cart };
      delete newCart[productId];
      setCart(newCart);
    } else {
      setCart(prev => ({
        ...prev,
        [productId]: {
          ...prev[productId],
          quantity: qty
        }
      }));
    }
  };

  const removeFromCart = (productId) => {
    const newCart = { ...cart };
    delete newCart[productId];
    setCart(newCart);
  };

  const handleQuantityChange = (productId, value, product) => {
    if (value === '' || value === '0') {
      if (cart[productId]) {
        const newCart = { ...cart };
        delete newCart[productId];
        setCart(newCart);
      }
    } else {
      const numVal = parseInt(value);
      if (!isNaN(numVal) && numVal > 0) {
        const currentQty = cart[productId]?.quantity || 0;
        const diff = numVal - currentQty;
        if (diff > 0) {
          addToCart(product, diff);
        } else if (diff < 0) {
          updateCartQuantity(productId, numVal);
        }
      }
    }
  };

  const totalItems = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);

  const handleBuyerSelect = (buyer) => {
    setSelectedBuyer(buyer);
    setShowBuyerModal(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', position: 'relative' }}>
      <Navbar />

      {/* Buyer Selection Modal - Fixed scrollbar */}
      {showBuyerModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '36px',
            width: '500px',
            maxWidth: '100%',
            maxHeight: '70vh',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
          }}>
            <h3 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '22px',
              color: '#2C1810',
              marginBottom: '8px',
              fontWeight: 600
            }}>
              Select Buyer
            </h3>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '13px',
              color: '#64748b',
              marginBottom: '24px'
            }}>
              Choose a buyer to view their customized pricing
            </p>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: 'calc(70vh - 160px)',
              overflowY: 'auto',
              paddingRight: '4px'
            }}
            className="custom-scrollbar"
            >
              {buyers.map((buyer) => (
                <button
                  key={buyer.id}
                  onClick={() => handleBuyerSelect(buyer)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    border: '1px solid #e5eeff',
                    borderRadius: '12px',
                    background: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = '#8B6914';
                    e.target.style.background = '#faf9f6';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = '#e5eeff';
                    e.target.style.background = 'white';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '2px'
                  }}>
                    <span style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#2C1810'
                    }}>
                      {buyer.name}
                    </span>
                    <span style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '12px',
                      color: '#64748b'
                    }}>
                      {buyer.city}
                    </span>
                  </div>
                  <div style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    background: '#f0e6d8',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#8B6914'
                  }}>
                    {buyer.discount}% OFF
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Flash Order Modal - Fixed scrollbar and input fields */}
      {showFlashOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '36px',
            width: '700px',
            maxWidth: '100%',
            maxHeight: '80vh',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px'
            }}>
              <h3 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '22px',
                color: '#2C1810',
                fontWeight: 600,
                margin: 0
              }}>
                Flash Order
              </h3>
              <button
                onClick={() => setShowFlashOrder(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  fontSize: '20px'
                }}
              >
                x
              </button>
            </div>

            {/* Category Tabs */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '20px',
              flexWrap: 'wrap'
            }}>
              {categories.map((cat) => (
                <button
                  key={cat.id || cat.name || cat}
                  onClick={() => setFlashCategory(cat.name || cat)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: 'none',
                    background: flashCategory === (cat.name || cat) ? '#8B6914' : '#f0e6d8',
                    color: flashCategory === (cat.name || cat) ? 'white' : '#5C4033',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {cat.name || cat}
                </button>
              ))}
            </div>

            {/* Flash Order Products */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: 'calc(80vh - 220px)',
              overflowY: 'auto',
              paddingRight: '4px'
            }}
            className="custom-scrollbar"
            >
              {flashProducts.map((product) => (
                <div
                  key={product.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid #e5eeff',
                    background: cart[product.id] ? '#faf9f6' : 'white'
                  }}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <span style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#2C1810',
                      display: 'block'
                    }}>
                      {product.name}
                    </span>
                    <span style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '11px',
                      color: '#64748b'
                    }}>
                      #{product.model}
                    </span>
                  </div>
                  <div style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#8B6914'
                  }}>
                    &#8377;{product.price}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <button
                      onClick={() => {
                        const current = cart[product.id]?.quantity || 0;
                        if (current > 0) {
                          updateCartQuantity(product.id, current - 1);
                        }
                      }}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        border: 'none',
                        background: '#e5eeff',
                        color: '#8B6914',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={cart[product.id]?.quantity || ''}
                      placeholder="0"
                      onChange={(e) => handleQuantityChange(product.id, e.target.value, product)}
                      onFocus={(e) => {
                        if (e.target.value === '0') {
                          e.target.value = '';
                        }
                      }}
                      style={{
                        width: '45px',
                        padding: '4px',
                        border: '1px solid #e5eeff',
                        borderRadius: '6px',
                        textAlign: 'center',
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '13px',
                        color: '#2C1810',
                        background: '#ffffff',
                        outline: 'none'
                      }}
                    />
                    <button
                      onClick={() => addToCart(product, 1)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        border: 'none',
                        background: '#8B6914',
                        color: 'white',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{
        display: 'flex',
        minHeight: '100vh',
        paddingTop: '60px',
        position: 'relative'
      }}>
        {/* Sidebar */}
        <div style={{
          width: sidebarOpen ? '240px' : '0',
          minWidth: sidebarOpen ? '240px' : '0',
          background: '#ffffff',
          borderRight: sidebarOpen ? '1px solid #e2e8f0' : 'none',
          transition: 'all 0.3s ease',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}
        className="sidebar"
        >
          <div style={{
            padding: sidebarOpen ? '20px 16px' : '0',
            opacity: sidebarOpen ? 1 : 0,
            transition: 'opacity 0.2s ease',
            flex: 1
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px'
            }}>
              <h3 style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '12px',
                fontWeight: 600,
                color: '#8B6914',
                letterSpacing: '1.5px',
                textTransform: 'uppercase'
              }}>
                Categories
              </h3>
              <button
                onClick={() => setSidebarOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8B6914',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '4px',
                  borderRadius: '4px'
                }}
                onMouseEnter={(e) => e.target.style.background = '#e5eeff'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                {'<'}
              </button>
            </div>
            
            {categories.map((cat) => (
              <button
                key={cat.id || cat.name || cat}
                onClick={() => setSelectedCategory(cat.name || cat)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 16px',
                  border: 'none',
                  borderRadius: '8px',
                  background: selectedCategory === (cat.name || cat) ? '#e5eeff' : 'transparent',
                  color: selectedCategory === (cat.name || cat) ? '#8B6914' : '#5C4033',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '14px',
                  fontWeight: selectedCategory === (cat.name || cat) ? 600 : 400,
                  transition: 'all 0.2s ease',
                  marginBottom: '4px'
                }}
              >
                {cat.name || cat}
              </button>
            ))}
          </div>
        </div>

        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              position: 'absolute',
              left: '0',
              top: '50%',
              transform: 'translateY(-50%)',
              background: '#8B6914',
              border: 'none',
              color: 'white',
              width: '32px',
              height: '60px',
              borderRadius: '0 8px 8px 0',
              cursor: 'pointer',
              fontSize: '16px',
              zIndex: 10
            }}
          >
            {'>'}
          </button>
        )}

        {/* Main Content */}
        <div style={{
          flex: 1,
          padding: '30px 40px',
          overflow: 'auto'
        }}>
          {/* Top Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <h2 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '28px',
                color: '#2C1810',
                fontWeight: 600,
                margin: '0 0 4px 0'
              }}>
                Create Order
              </h2>
              {selectedBuyer && (
                <span style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '13px',
                  color: '#8B6914',
                  fontWeight: 500
                }}>
                  Buyer: {selectedBuyer.name} ({selectedBuyer.discount}% discount applied)
                </span>
              )}
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center'
            }}>
              <button
                onClick={() => setShowFlashOrder(true)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #8B6914',
                  background: 'transparent',
                  color: '#8B6914',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f0e6d8';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                }}
              >
                Flash Order
              </button>
              <button
                onClick={() => window.location.href = '/cart'}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#8B6914',
                  color: 'white',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#A0522D';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#8B6914';
                }}
              >
                View Cart ({totalItems})
              </button>
            </div>
          </div>

          {/* Mobile Category Swapper */}
          <div className="mobile-category-swapper" style={{
            gap: '8px',
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}>
            {categories.map((cat) => (
              <button
                key={cat.id || cat.name || cat}
                onClick={() => setSelectedCategory(cat.name || cat)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: 'none',
                  background: selectedCategory === (cat.name || cat) ? '#8B6914' : '#f0e6d8',
                  color: selectedCategory === (cat.name || cat) ? 'white' : '#5C4033',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '12px',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.2s ease'
                }}
              >
                {cat.name || cat}
              </button>
            ))}
          </div>

          {/* Category Title */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px'
          }}>
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '36px',
              color: '#2C1810',
              fontWeight: 600,
              margin: 0
            }}>
              {selectedCategory}
            </h2>
          </div>

          {/* Products Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '24px',
            justifyItems: 'center'
          }}>
            {currentProducts.map((product) => (
              <div
                key={product.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '16px 16px 20px',
                  borderRadius: '20px',
                  transition: 'all 0.3s ease',
                  width: '100%',
                  maxWidth: '280px',
                  position: 'relative',
                  background: '#faf9f6'
                }}
              >
                <div style={{
                  width: '160px',
                  height: '160px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '4px solid #e5eeff',
                  boxShadow: '0 6px 25px rgba(0,0,0,0.06)',
                  transition: 'all 0.3s ease'
                }}>
                  <img
                    src={product.image}
                    alt={product.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                </div>

                <div style={{ textAlign: 'center' }}>
                  <h4 style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#2C1810',
                    margin: '0 0 4px 0'
                  }}>
                    {product.name}
                  </h4>
                  <span style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '11px',
                    color: '#8B6914',
                    fontWeight: 500,
                    background: '#f0e6d8',
                    padding: '3px 10px',
                    borderRadius: '12px'
                  }}>
                    #{product.model}
                  </span>
                </div>

                {/* Price Display */}
                <div style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#8B6914'
                }}>
                  &#8377;{product.price}
                  {product.discount > 0 && (
                    <span style={{
                      fontSize: '12px',
                      color: '#64748b',
                      fontWeight: 400,
                      textDecoration: 'line-through',
                      marginLeft: '6px'
                    }}>
                      &#8377;{product.originalPrice}
                    </span>
                  )}
                </div>

                {/* Add to Cart Controls */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#f8f9ff',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid #e5eeff'
                }}>
                  <button
                    onClick={() => {
                      const current = cart[product.id]?.quantity || 0;
                      if (current > 0) {
                        updateCartQuantity(product.id, current - 1);
                      }
                    }}
                    style={{
                      background: '#e5eeff',
                      border: 'none',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#8B6914',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold'
                    }}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={cart[product.id]?.quantity || ''}
                    placeholder="0"
                    onChange={(e) => handleQuantityChange(product.id, e.target.value, product)}
                    onFocus={(e) => {
                      if (e.target.value === '0') {
                        e.target.value = '';
                      }
                    }}
                    style={{
                      width: '50px',
                      padding: '4px',
                      border: 'none',
                      borderRadius: '6px',
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#2C1810',
                      textAlign: 'center',
                      background: 'transparent',
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={() => addToCart(product, 1)}
                    style={{
                      background: '#8B6914',
                      border: 'none',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold'
                    }}
                  >
                    +
                  </button>
                </div>

                {/* Stock indicator */}
                <span style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '11px',
                  color: product.stock > 20 ? '#059669' : product.stock > 10 ? '#d97706' : '#dc2626'
                }}>
                  {product.stock} in stock
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5eeff;
          border-radius: 2px;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #e5eeff transparent;
        }

        @media (max-width: 1024px) {
          .sidebar {
            display: none !important;
          }
          .mobile-category-swapper {
            display: flex !important;
            flex-wrap: wrap;
          }
        }
        @media (min-width: 1025px) {
          .mobile-category-swapper {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default CreateOrder;
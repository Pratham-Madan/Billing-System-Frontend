import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getCategories, getProducts, getAdminProductsWithPrices, createProduct, updateProduct, deleteProduct, updateProductStock, uploadProductImage } from '../api';

function Catalog() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    fetchCategories();
  }, [navigate]);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Taps');
  const [showAddModal, setShowAddModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [editValues, setEditValues] = useState({});
  const [deleteMode, setDeleteMode] = useState(false);
  
  const [newProduct, setNewProduct] = useState({
    name: '',
    model: '',
    price: '',
    stock: '',
    imageFile: null
  });

  const fetchCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
      if (data.length > 0 && typeof selectedCategory === 'string' && selectedCategory.length < 10) {
        setSelectedCategory(data[0].id);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  useEffect(() => {
    if (selectedCategory && selectedCategory.length > 10) {
      getAdminProductsWithPrices(selectedCategory).then(data => {
        setProducts(data.map(p => ({ ...p, price: p.basePrice, image: p.imageUrl })));
        setEditValues({});
        setHasChanges(false);
        setDeleteMode(false);
      }).catch(err => console.error("Error fetching products:", err));
    }
  }, [selectedCategory]);

  const currentProducts = products;

  const handleEditChange = (productId, field, value) => {
    setHasChanges(true);
    setEditValues(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
    }));
  };

  const incrementValue = (productId, field) => {
    const currentValue = editValues[productId]?.[field] !== undefined 
      ? parseFloat(editValues[productId][field]) 
      : products.find(p => p.id === productId)?.[field] || 0;
    
    const increment = field === 'price' ? 10 : 1;
    handleEditChange(productId, field, (currentValue + increment).toString());
    setHasChanges(true);
  };

  const decrementValue = (productId, field) => {
    const currentValue = editValues[productId]?.[field] !== undefined 
      ? parseFloat(editValues[productId][field]) 
      : products.find(p => p.id === productId)?.[field] || 0;
    
    const decrement = field === 'price' ? 10 : 1;
    const newValue = Math.max(0, currentValue - decrement);
    handleEditChange(productId, field, newValue.toString());
    setHasChanges(true);
  };

  const handleApplyChanges = async () => {
    try {
      for (const [id, updates] of Object.entries(editValues)) {
        if (updates.deleted) {
          await deleteProduct(id);
          continue;
        }
        if (updates.price !== undefined) {
          const product = products.find(p => p.id === id);
          if (product) {
            await updateProduct(id, {
              name: product.name,
              modelNumber: product.modelNumber || product.model || "",
              categoryId: product.categoryId,
              description: product.description || "",
              basePrice: parseFloat(updates.price),
              stock: product.stock,
              isActive: product.isActive !== undefined ? product.isActive : true,
              imageUrl: product.image,
              imagePublicId: product.imagePublicId
            });
          }
        }
        if (updates.stock !== undefined) {
          const product = products.find(p => p.id === id);
          if (product) {
            await updateProductStock(id, parseInt(updates.stock), 'set');
          }
        }
      }
      const updatedProducts = await getAdminProductsWithPrices(selectedCategory);
      setProducts(updatedProducts.map(p => ({ ...p, price: p.basePrice, image: p.imageUrl })));
      setEditValues({});
      setHasChanges(false);
      setDeleteMode(false);
    } catch (error) {
      console.error("Error updating products", error);
      alert("Failed to apply changes");
    }
  };

  const handleDeleteProduct = (productId) => {
    setEditValues(prev => ({
      ...prev,
      [productId]: { ...prev[productId], deleted: true }
    }));
    setHasChanges(true);
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.model || !newProduct.price || !newProduct.stock) {
      alert('Please fill all required fields');
      return;
    }

    try {
      const created = await createProduct({
        categoryId: selectedCategory,
        name: newProduct.name,
        modelNumber: newProduct.model,
        basePrice: parseFloat(newProduct.price),
        stock: parseInt(newProduct.stock)
      });
      
      if (newProduct.imageFile) {
        await uploadProductImage(created.id, newProduct.imageFile);
      }
      
      const updatedProducts = await getAdminProductsWithPrices(selectedCategory);
      setProducts(updatedProducts.map(p => ({ ...p, price: p.basePrice, image: p.imageUrl })));
      setNewProduct({ name: '', model: '', price: '', stock: '', imageFile: null });
      setShowAddModal(false);
    } catch (error) {
      console.error("Error creating product", error);
      alert("Failed to add product");
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#ffffff',
      position: 'relative'
    }}>
      <Navbar />

      <div style={{
        display: 'flex',
        minHeight: '100vh',
        paddingTop: '60px',
        position: 'relative'
      }}>
        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.3)',
              zIndex: 998,
              display: 'none'
            }}
            className="mobile-overlay"
          />
        )}

        {/* Desktop Sidebar */}
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
                  borderRadius: '4px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#e5eeff'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                {'<'}
              </button>
            </div>
            
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setEditValues({});
                  setHasChanges(false);
                  setDeleteMode(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 16px',
                  border: 'none',
                  borderRadius: '8px',
                  background: selectedCategory === cat.id ? '#e5eeff' : 'transparent',
                  color: selectedCategory === cat.id ? '#8B6914' : '#5C4033',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '14px',
                  fontWeight: selectedCategory === cat.id ? 600 : 400,
                  transition: 'all 0.2s ease',
                  marginBottom: '4px'
                }}
                onMouseEnter={(e) => {
                  if (selectedCategory !== cat.name) {
                    e.target.style.background = '#f1f5f9';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCategory !== cat.name) {
                    e.target.style.background = 'transparent';
                  }
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Sidebar Open Button (when closed) */}
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10
            }}
            className="desktop-sidebar-toggle"
          >
            {'>'}
          </button>
        )}

        {/* Mobile Sidebar Toggle Button */}
        <button
          onClick={() => setMobileSidebarOpen(true)}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: '#8B6914',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '20px',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            boxShadow: '0 4px 15px rgba(139,105,20,0.3)'
          }}
          className="mobile-sidebar-btn"
        >
          &#9776;
        </button>

        {/* Mobile Sidebar Drawer */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '280px',
          background: '#ffffff',
          zIndex: 999,
          transform: mobileSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
          boxShadow: '4px 0 20px rgba(0,0,0,0.1)',
          padding: '80px 20px 20px',
          display: 'none'
        }}
        className="mobile-sidebar-drawer"
        >
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
              onClick={() => setMobileSidebarOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#8B6914',
                cursor: 'pointer',
                fontSize: '20px'
              }}
            >
              x
            </button>
          </div>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setEditValues({});
                setHasChanges(false);
                setDeleteMode(false);
                setMobileSidebarOpen(false);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                border: 'none',
                borderRadius: '8px',
                background: selectedCategory === cat.id ? '#e5eeff' : 'transparent',
                color: selectedCategory === cat.id ? '#8B6914' : '#5C4033',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                fontSize: '15px',
                fontWeight: selectedCategory === cat.id ? 600 : 400,
                marginBottom: '4px'
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div style={{
          flex: 1,
          padding: '30px 40px',
          transition: 'margin-left 0.3s ease',
          overflow: 'auto'
        }}>
          {/* Top Right Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginBottom: '20px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            {/* Apply Changes Button */}
            {hasChanges && (
              <button
                onClick={handleApplyChanges}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#059669',
                  color: 'white',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.3px',
                  marginRight: 'auto'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#047857';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#059669';
                }}
              >
                Apply Changes
              </button>
            )}
            
            <button
              onClick={() => setShowAddModal(true)}
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
                transition: 'all 0.2s ease',
                letterSpacing: '0.3px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#A0522D';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#8B6914';
              }}
            >
              Add Product
            </button>
            <button
              onClick={() => setDeleteMode(!deleteMode)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: deleteMode ? 'none' : '1px solid #dc2626',
                background: deleteMode ? '#dc2626' : 'transparent',
                color: deleteMode ? 'white' : '#dc2626',
                fontFamily: "'Inter', sans-serif",
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                letterSpacing: '0.3px'
              }}
              onMouseEnter={(e) => {
                if (!deleteMode) {
                  e.target.style.background = '#fee2e2';
                }
              }}
              onMouseLeave={(e) => {
                if (!deleteMode) {
                  e.target.style.background = 'transparent';
                }
              }}
            >
              {deleteMode ? 'Cancel Delete' : 'Delete Product'}
            </button>
          </div>

          {/* Category Title - Increased size */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '36px',
              color: '#2C1810',
              fontWeight: 600,
              margin: 0
            }}>
              {categories.find(c => c.id === selectedCategory)?.name || selectedCategory}
            </h2>
            <span style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '13px',
              color: '#8B6914',
              fontWeight: 500
            }}>
              {currentProducts.length} products
            </span>
          </div>

          {/* Products Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '24px',
            justifyItems: 'center',
            marginTop: '0'
          }}>
            {currentProducts.map((product) => {
              if (editValues[product.id]?.deleted) return null;
              
              return (
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f5f3ef';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#faf9f6';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Delete Button */}
                {deleteMode && (
                  <button
                    onClick={() => handleDeleteProduct(product.id)}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      border: 'none',
                      background: '#dc2626',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 10,
                      boxShadow: '0 2px 8px rgba(220,38,38,0.3)'
                    }}
                  >
                    x
                  </button>
                )}

                {/* Product Image */}
                <div style={{
                  width: '180px',
                  height: '180px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '4px solid #e5eeff',
                  boxShadow: '0 6px 25px rgba(0,0,0,0.06)',
                  transition: 'all 0.3s ease',
                  marginTop: '-8px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#8B6914';
                  e.currentTarget.style.transform = 'scale(1.03)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5eeff';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                >
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

                {/* Product Name & Model */}
                <div style={{
                  textAlign: 'center'
                }}>
                  <h4 style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#2C1810',
                    margin: '0 0 6px 0',
                    lineHeight: '1.3'
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
                    {product.modelNumber || product.model}
                  </span>
                </div>

                {/* Editable Price */}
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
                    onClick={() => decrementValue(product.id, 'price')}
                    style={{
                      background: '#e5eeff',
                      border: 'none',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: '#8B6914',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold'
                    }}
                  >
                    -
                  </button>
                  <span style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '11px',
                    color: '#5C4033',
                    fontWeight: 500
                  }}>
                    &#8377;
                  </span>
                  <input
                    type="number"
                    value={editValues[product.id]?.price !== undefined ? editValues[product.id].price : product.price}
                    onChange={(e) => handleEditChange(product.id, 'price', e.target.value)}
                    style={{
                      width: '60px',
                      padding: '4px 4px',
                      border: 'none',
                      borderRadius: '6px',
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#8B6914',
                      textAlign: 'center',
                      background: 'transparent',
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={() => incrementValue(product.id, 'price')}
                    style={{
                      background: '#8B6914',
                      border: 'none',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      fontSize: '12px',
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

                {/* Editable Stock */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#f8f9ff',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e5eeff'
                }}>
                  <button
                    onClick={() => decrementValue(product.id, 'stock')}
                    style={{
                      background: '#e5eeff',
                      border: 'none',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      fontSize: '11px',
                      color: '#8B6914',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold'
                    }}
                  >
                    -
                  </button>
                  <div style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: (editValues[product.id]?.stock !== undefined ? editValues[product.id].stock : product.stock) > 20 ? '#059669' : (editValues[product.id]?.stock !== undefined ? editValues[product.id].stock : product.stock) > 10 ? '#d97706' : '#dc2626'
                  }} />
                  <input
                    type="number"
                    value={editValues[product.id]?.stock !== undefined ? editValues[product.id].stock : product.stock}
                    onChange={(e) => handleEditChange(product.id, 'stock', e.target.value)}
                    style={{
                      width: '40px',
                      padding: '2px 4px',
                      border: 'none',
                      borderRadius: '4px',
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#5C4033',
                      textAlign: 'center',
                      background: 'transparent',
                      outline: 'none'
                    }}
                  />
                  <span style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '10px',
                    color: '#5C4033'
                  }}>
                    stock
                  </span>
                  <button
                    onClick={() => incrementValue(product.id, 'stock')}
                    style={{
                      background: '#8B6914',
                      border: 'none',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      fontSize: '11px',
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
              </div>
            )})}
          </div>
        </div>
      </div>

      {/* Add Product Modal - UPDATED with white background inputs and dark placeholder text */}
      {showAddModal && (
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
            width: '420px',
            maxWidth: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
          }}>
            <h3 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '22px',
              color: '#2C1810',
              marginBottom: '24px',
              fontWeight: 600
            }}>
              Add Product
            </h3>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              <input
                type="text"
                placeholder="Product Name"
                value={newProduct.name}
                onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                style={{
                  padding: '12px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '14px',
                  outline: 'none',
                  color: '#2C1810',
                  background: '#ffffff',
                  '::placeholder': {
                    color: '#64748b',
                    opacity: 1
                  }
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#8B6914';
                  e.target.style.boxShadow = '0 0 0 2px rgba(139,105,20,0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />

              <input
                type="text"
                placeholder="Model Number"
                value={newProduct.model}
                onChange={(e) => setNewProduct({...newProduct, model: e.target.value})}
                style={{
                  padding: '12px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '14px',
                  outline: 'none',
                  color: '#2C1810',
                  background: '#ffffff'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#8B6914';
                  e.target.style.boxShadow = '0 0 0 2px rgba(139,105,20,0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />

              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setNewProduct({...newProduct, imageFile: e.target.files[0]});
                  }
                }}
                style={{
                  padding: '12px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '14px',
                  outline: 'none',
                  color: '#2C1810',
                  background: '#ffffff',
                  cursor: 'pointer'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#8B6914';
                  e.target.style.boxShadow = '0 0 0 2px rgba(139,105,20,0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />

              <div style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  flex: '1',
                  minWidth: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <label style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '11px',
                    color: '#5C4033',
                    fontWeight: 500
                  }}>
                    Base Price (&#8377;)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                    style={{
                      padding: '12px 16px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '14px',
                      outline: 'none',
                      color: '#2C1810',
                      background: '#ffffff'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#8B6914';
                      e.target.style.boxShadow = '0 0 0 2px rgba(139,105,20,0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div style={{
                  flex: '1',
                  minWidth: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <label style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '11px',
                    color: '#5C4033',
                    fontWeight: 500
                  }}>
                    Stock
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})}
                    style={{
                      padding: '12px 16px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '14px',
                      outline: 'none',
                      color: '#2C1810',
                      background: '#ffffff'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#8B6914';
                      e.target.style.boxShadow = '0 0 0 2px rgba(139,105,20,0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '28px',
              justifyContent: 'flex-end',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  background: 'white',
                  color: '#5C4033',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f8f9ff';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'white';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddProduct}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#8B6914',
                  color: 'white',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#A0522D';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#8B6914';
                }}
              >
                Add Product
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }

        /* Placeholder styling */
        input::placeholder {
          color: #64748b !important;
          opacity: 1 !important;
        }
        
        input::-webkit-input-placeholder {
          color: #64748b !important;
          opacity: 1 !important;
        }
        
        input:-moz-placeholder {
          color: #64748b !important;
          opacity: 1 !important;
        }
        
        input::-moz-placeholder {
          color: #64748b !important;
          opacity: 1 !important;
        }
        
        input:-ms-input-placeholder {
          color: #64748b !important;
          opacity: 1 !important;
        }

        @media (max-width: 768px) {
          .sidebar {
            display: none !important;
          }
          .desktop-sidebar-toggle {
            display: none !important;
          }
          .mobile-sidebar-btn {
            display: flex !important;
          }
          .mobile-sidebar-drawer {
            display: block !important;
          }
          .mobile-overlay {
            display: block !important;
          }
        }

        @media (min-width: 769px) {
          .mobile-sidebar-btn {
            display: none !important;
          }
          .mobile-sidebar-drawer {
            display: none !important;
          }
          .mobile-overlay {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Catalog;
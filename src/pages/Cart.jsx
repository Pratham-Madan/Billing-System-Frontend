import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { createInvoice, updateProductStock } from '../api';

function Cart() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const [cart, setCart] = useState(() => {
    const saved = sessionStorage.getItem('orderCart');
    return saved ? JSON.parse(saved) : {};
  });

  const updateCartQuantity = (productId, quantity) => {
    const qty = parseInt(quantity);
    if (qty <= 0) {
      const newCart = { ...cart };
      delete newCart[productId];
      setCart(newCart);
      sessionStorage.setItem('orderCart', JSON.stringify(newCart));
    } else {
      setCart(prev => {
        const updated = { ...prev };
        if (updated[productId]) {
          updated[productId] = { ...updated[productId], quantity: qty };
        }
        sessionStorage.setItem('orderCart', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const removeFromCart = (productId) => {
    const newCart = { ...cart };
    delete newCart[productId];
    setCart(newCart);
    sessionStorage.setItem('orderCart', JSON.stringify(newCart));
  };

  const clearCart = () => {
    setCart({});
    sessionStorage.removeItem('orderCart');
  };

  const cartItems = Object.values(cart);
  
  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.quantity * parseFloat(item.price)), 0);
  const gst = subtotal * 0.05;
  const grandTotal = subtotal + gst;

  const handleGenerateBill = async () => {
    try {
      const buyerStr = sessionStorage.getItem('selectedBuyer');
      if (!buyerStr) {
        alert("No buyer selected. Please go back to Create Order and select a buyer.");
        return;
      }
      const buyer = JSON.parse(buyerStr);
      
      const payload = {
        customerId: buyer.id,
        invoiceDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        remarks: "Generated from cart",
        items: cartItems.map(item => ({
          productId: item.id,
          quantity: parseInt(item.quantity),
          overrideRate: parseFloat(item.price)
        }))
      };

      const invoice = await createInvoice(payload);
      
      // Deduct stock for each item
      await Promise.all(
        cartItems.map(item => 
          updateProductStock(item.id, -parseInt(item.quantity), 'add')
        )
      );
      
      sessionStorage.setItem('generatedBillId', invoice.id);
      sessionStorage.removeItem('orderCart');
      sessionStorage.removeItem('selectedBuyer');
      
      window.location.href = '/generate-bill';
    } catch (err) {
      console.error("Failed to generate bill", err);
      alert("Failed to generate bill. Check console for details.");
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', position: 'relative' }}>
      <Navbar />

      <div style={{
        padding: '80px 40px 40px',
        maxWidth: '1000px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '32px',
              color: '#2C1810',
              fontWeight: 600,
              margin: '0 0 4px 0'
            }}>
              Create Order
            </h2>
            <span style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '14px',
              color: '#64748b'
            }}>
              {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in your cart
            </span>
          </div>

          {cartItems.length > 0 && (
            <button
              onClick={clearCart}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid #dc2626',
                background: 'transparent',
                color: '#dc2626',
                fontFamily: "'Inter', sans-serif",
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#fee2e2';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
              }}
            >
              Clear Cart
            </button>
          )}
        </div>

        {cartItems.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '80px 20px',
            background: '#faf9f6',
            borderRadius: '20px',
            border: '1px solid #e5eeff'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px'
            }}>
              &#128722;
            </div>
            <h3 style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '20px',
              color: '#2C1810',
              fontWeight: 600,
              margin: '0 0 8px 0'
            }}>
              Your cart is empty
            </h3>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '14px',
              color: '#64748b',
              margin: '0 0 24px 0'
            }}>
              Browse our catalog and add items to get started
            </p>
            <a
              href="/create-order"
              style={{
                padding: '12px 32px',
                borderRadius: '10px',
                border: 'none',
                background: '#8B6914',
                color: 'white',
                fontFamily: "'Inter', sans-serif",
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'none',
                display: 'inline-block'
              }}
            >
              Continue
            </a>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            gap: '24px',
            flexWrap: 'wrap'
          }}>
            {/* Cart Items */}
            <div style={{
              flex: '1',
              minWidth: '300px'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '16px',
                      borderRadius: '16px',
                      border: '1px solid #e5eeff',
                      background: '#faf9f6'
                    }}
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{
                        width: '70px',
                        height: '70px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid #e5eeff',
                        flexShrink: 0
                      }}
                    />
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#2C1810',
                        margin: '0 0 4px 0',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {item.name}
                      </h4>
                      <span style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '12px',
                        color: '#8B6914',
                        fontWeight: 500,
                        background: '#f0e6d8',
                        padding: '2px 8px',
                        borderRadius: '8px'
                      }}>
                        #{item.model}
                      </span>
                      <div style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '16px',
                        fontWeight: 700,
                        color: '#8B6914',
                        marginTop: '6px'
                      }}>
                        &#8377;{(item.quantity * parseFloat(item.price)).toFixed(2)}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#ffffff',
                        padding: '6px 10px',
                        borderRadius: '10px',
                        border: '1px solid #e5eeff'
                      }}>
                        <button
                          onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            border: 'none',
                            background: '#e5eeff',
                            color: '#8B6914',
                            cursor: 'pointer',
                            fontSize: '14px',
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
                          value={item.quantity}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || val === '0') {
                              updateCartQuantity(item.id, 0);
                            } else {
                              const numVal = parseInt(val);
                              if (!isNaN(numVal) && numVal > 0) {
                                updateCartQuantity(item.id, numVal);
                              }
                            }
                          }}
                          onFocus={(e) => {
                            if (e.target.value === '0') {
                              e.target.value = '';
                            }
                          }}
                          onBlur={(e) => {
                            if (e.target.value === '') {
                              e.target.value = '0';
                              updateCartQuantity(item.id, 0);
                            }
                          }}
                          style={{
                            width: '45px',
                            padding: '4px 6px',
                            border: '1px solid #e5eeff',
                            borderRadius: '6px',
                            textAlign: 'center',
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#2C1810',
                            background: '#ffffff',
                            outline: 'none'
                          }}
                        />
                        <button
                          onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            border: 'none',
                            background: '#8B6914',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#dc2626',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontFamily: "'Inter', sans-serif",
                          fontWeight: 500
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div style={{
              width: '320px',
              padding: '24px',
              borderRadius: '20px',
              border: '1px solid #e5eeff',
              background: '#faf9f6',
              height: 'fit-content',
              position: 'sticky',
              top: '100px'
            }}>
              <h3 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '20px',
                color: '#2C1810',
                fontWeight: 600,
                margin: '0 0 20px 0'
              }}>
                Order Summary
              </h3>

              {/* Subtotal */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: '1px solid #e5eeff'
              }}>
                <span style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '14px',
                  color: '#5C4033'
                }}>
                  Subtotal
                </span>
                <span style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#2C1810'
                }}>
                  &#8377;{subtotal.toFixed(2)}
                </span>
              </div>

              {/* GST */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: '1px solid #e5eeff'
              }}>
                <span style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '14px',
                  color: '#5C4033'
                }}>
                  GST (5%)
                </span>
                <span style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#2C1810'
                }}>
                  &#8377;{gst.toFixed(2)}
                </span>
              </div>

              {/* Grand Total */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                marginTop: '4px'
              }}>
                <span style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#2C1810'
                }}>
                  Grand Total
                </span>
                <span style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#8B6914'
                }}>
                  &#8377;{grandTotal.toFixed(2)}
                </span>
              </div>

              {/* Generate Bill Button */}
              <button
                onClick={handleGenerateBill}
                style={{
                  width: '100%',
                  marginTop: '20px',
                  padding: '14px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #8B6914 0%, #A0522D 100%)',
                  color: 'white',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.5px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 25px rgba(139,105,20,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                Generate Bill
              </button>

              {/* Continue */}
              <a
                href="/create-order"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  marginTop: '12px',
                  color: '#8B6914',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '13px',
                  fontWeight: 500,
                  textDecoration: 'none'
                }}
              >
                Continue Shopping
              </a>
            </div>
          </div>
        )}
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
      `}</style>
    </div>
  );
}

export default Cart;
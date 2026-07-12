import Navbar from '../components/Navbar';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

function Homepage() {
  const navigate = useNavigate();

  // Authentication check on component mount
  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const images = [
    {
      url: "https://media.istockphoto.com/id/1454303048/photo/modern-dark-luxury-minimalist-bathroom.jpg?b=1&s=612x612&w=0&k=20&c=38sT29Kkl7Er0wfslVyqPxLECRc3WjyF0_q_ZVdQGUU=",
      offset: '-24px',
      label: 'Premium Taps'
    },
    {
      url: "https://images.pexels.com/photos/9695823/pexels-photo-9695823.jpeg",
      offset: '24px',
      label: 'Luxury Showers'
    },
    {
      url: "https://images.pexels.com/photos/36718391/pexels-photo-36718391.jpeg",
      offset: '-24px',
      label: 'Elegant Basins'
    },
    {
      url: "https://images.pexels.com/photos/30457600/pexels-photo-30457600.jpeg",
      offset: '24px',
      label: 'Modern Drains'
    }
  ];

  // Chart configurations
  const chartOptions = {
    cutout: '75%',
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: false
      }
    },
    animation: {
      animateRotate: true,
      duration: 2000
    },
    maintainAspectRatio: true,
    responsive: true
  };

  const totalSalesChart = {
    datasets: [{
      data: [78, 22],
      backgroundColor: [
        '#8B6914',
        '#f0e6d8'
      ],
      borderWidth: 0,
      hoverBackgroundColor: ['#A0522D', '#f0e6d8'],
      borderRadius: 8,
      spacing: 2
    }]
  };

  const totalProfitsChart = {
    datasets: [{
      data: [65, 35],
      backgroundColor: [
        '#A0522D',
        '#f0e6d8'
      ],
      borderWidth: 0,
      hoverBackgroundColor: ['#8B4513', '#f0e6d8'],
      borderRadius: 8,
      spacing: 2
    }]
  };

  const newUsersChart = {
    datasets: [{
      data: [92, 8],
      backgroundColor: [
        '#DAA520',
        '#f0e6d8'
      ],
      borderWidth: 0,
      hoverBackgroundColor: ['#B8860B', '#f0e6d8'],
      borderRadius: 8,
      spacing: 2
    }]
  };

  // Parallax effect with mobile detection
  const [parallaxOffset, setParallaxOffset] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    let rafId = 0;

    const handleScroll = () => {
      if (rafId) return;

      rafId = window.requestAnimationFrame(() => {
        const y = window.scrollY || window.pageYOffset;
        const offset = Math.max(-60, Math.min(60, y * 0.12));
        setParallaxOffset(offset);
        rafId = 0;
      });
    };

    if (!isMobile) {
      handleScroll();
      window.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkMobile);
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [isMobile]);

  return (
    <div style={{ width: '100%', minHeight: '100%', overflowX: 'clip' }}>
      {/* Hero Section */}
      <div data-section="hero" style={{
        width: '100%',
        minHeight: '100svh',
        position: 'relative',
        overflow: 'hidden',
        background: `url("https://images.pexels.com/photos/35209394/pexels-photo-35209394.jpeg")`,
        backgroundSize: 'cover',
        backgroundPosition: `center ${isMobile ? 'center' : `calc(50% - ${parallaxOffset * 0.45}px)`}`,
        backgroundAttachment: isMobile ? 'fixed' : 'scroll'
      }}>
        {/* Overlay with glassmorphism */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          zIndex: 0
        }} />

        {/* Navbar */}
        <Navbar />

        {/* Main Content */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100svh',
          padding: isMobile ? '80px 16px 20px' : '70px 24px 28px',
          transform: 'translateY(-28px)',
          boxSizing: 'border-box'
        }}>
          {/* Hero Text */}
          <div style={{
            marginBottom: isMobile ? '24px' : '36px',
            textAlign: 'center',
            width: '100%'
          }}>
            <h1 style={{
              fontFamily: "'Playfair Display', 'Great Vibes', cursive",
              fontSize: isMobile ? 'clamp(40px, 12vw, 60px)' : 'clamp(60px, 10vw, 120px)',
              color: 'white',
              margin: 0,
              fontWeight: 400,
              lineHeight: 1,
              textShadow: '0 4px 30px rgba(0, 0, 0, 0.3)',
              letterSpacing: isMobile ? '2px' : '4px'
            }}>
              Sanitary
            </h1>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: isMobile ? 'clamp(12px, 3vw, 14px)' : 'clamp(14px, 2.5vw, 18px)',
              color: 'rgba(255, 255, 255, 0.85)',
              margin: '12px 0 0 0',
              letterSpacing: isMobile ? '4px' : '6px',
              textTransform: 'uppercase',
              fontWeight: 300,
              textShadow: '0 2px 20px rgba(0, 0, 0, 0.2)'
            }}>
              Solutions
            </p>
          </div>

          {/* Image Gallery with enhanced hover effects */}
          <div className="hero-cards-grid" style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
            gap: isMobile ? '10px' : '16px',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            maxWidth: isMobile ? '100%' : '1200px',
            padding: isMobile ? '0 8px' : '0',
            boxSizing: 'border-box'
          }}>
            {images.map((image, index) => (
              <div
                key={index}
                style={{
                  width: '100%',
                  aspectRatio: isMobile ? '3/4' : 'auto',
                  height: isMobile ? 'auto' : 'clamp(220px, 30vw, 360px)',
                  borderRadius: isMobile ? '12px' : '20px',
                  overflow: 'hidden',
                  position: 'relative',
                  cursor: 'pointer',
                  transform: isMobile ? 'none' : `translateY(${image.offset})`,
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                  border: isMobile ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(255, 255, 255, 0.1)'
                }}
                onMouseEnter={(e) => {
                  if (!isMobile) {
                    const card = e.currentTarget;
                    const img = card.querySelector('img');
                    const overlay = card.querySelector('.card-overlay');
                    card.style.transform = `translateY(${parseInt(image.offset) - 15}px) scale(1.03)`;
                    card.style.boxShadow = '0 30px 60px rgba(0, 0, 0, 0.5)';
                    card.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    if (img) img.style.transform = 'scale(1.1)';
                    if (overlay) overlay.style.opacity = '1';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMobile) {
                    const card = e.currentTarget;
                    const img = card.querySelector('img');
                    const overlay = card.querySelector('.card-overlay');
                    card.style.transform = `translateY(${image.offset}) scale(1)`;
                    card.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3)';
                    card.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    if (img) img.style.transform = 'scale(1)';
                    if (overlay) overlay.style.opacity = '0';
                  }
                }}
              >
                <img
                  src={image.url}
                  alt={image.label}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.4s ease'
                  }}
                />

                <div className="card-overlay" style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: isMobile ? '12px' : '20px',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
                  opacity: isMobile ? 1 : 0,
                  transition: 'opacity 0.3s ease'
                }}>
                  <span style={{
                    color: 'white',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: isMobile ? '11px' : '14px',
                    fontWeight: 500,
                    letterSpacing: isMobile ? '0.5px' : '1px'
                  }}>
                    {image.label}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Scroll indicator - hidden on mobile */}
          {!isMobile && (
            <div style={{
              position: 'absolute',
              bottom: '30px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              opacity: 0.6
            }}>
              <span style={{
                color: 'white',
                fontFamily: "'Inter', sans-serif",
                fontSize: '12px',
                letterSpacing: '2px'
              }}>
                SCROLL
              </span>
              <div style={{
                width: '1px',
                height: '30px',
                background: 'linear-gradient(to bottom, white, transparent)'
              }} />
            </div>
          )}
        </div>
      </div>

      {/* Analytics Section */}
      <div
        data-section="analytics"
        style={{
          width: '100%',
          minHeight: '100vh',
          background: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isMobile ? '40px 16px' : '80px 20px',
          boxSizing: 'border-box'
        }}
      >
        {/* Decorative background elements - hidden on mobile */}
        {!isMobile && (
          <>
            <div style={{
              position: 'absolute',
              top: '-100px',
              right: '-100px',
              width: '400px',
              height: '400px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, #f5e6d3 0%, transparent 70%)',
              opacity: 0.5,
              transform: `translate3d(0, ${-parallaxOffset * 0.4}px, 0)`,
              willChange: 'transform'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '-80px',
              left: '-80px',
              width: '300px',
              height: '300px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, #e8d5b7 0%, transparent 70%)',
              opacity: 0.3,
              transform: `translate3d(0, ${parallaxOffset * 0.3}px, 0)`,
              willChange: 'transform'
            }} />
          </>
        )}

        {/* Section Title */}
        <div style={{
          textAlign: 'center',
          marginBottom: isMobile ? '32px' : '60px',
          position: 'relative',
          zIndex: 1,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: isMobile ? 'clamp(24px, 6vw, 32px)' : 'clamp(32px, 5vw, 48px)',
            color: '#2C1810',
            margin: '0 0 12px 0',
            fontWeight: 600,
            letterSpacing: isMobile ? '0.5px' : '1px',
            textAlign: 'center'
          }}>
            Analytics Overview
          </h2>
          <div style={{
            width: isMobile ? '40px' : '60px',
            height: '3px',
            background: 'linear-gradient(90deg, #8B6914, #DAA520)',
            margin: '0 auto',
            borderRadius: '2px'
          }} />
        </div>

        {/* Donut Charts Container */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '20px' : 'clamp(30px, 5vw, 60px)',
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: isMobile ? '30px' : '50px',
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: isMobile ? '100%' : '1200px',
          marginLeft: 'auto',
          marginRight: 'auto',
          padding: 0,
          boxSizing: 'border-box'
        }}>
          {/* Total Sales Chart */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            padding: isMobile ? '24px 20px' : '35px 25px',
            borderRadius: isMobile ? '16px' : '24px',
            background: 'linear-gradient(145deg, #ffffff 0%, #faf5ef 100%)',
            boxShadow: '0 10px 30px rgba(139, 105, 20, 0.1)',
            border: '1px solid rgba(139, 105, 20, 0.08)',
            transition: 'all 0.4s ease',
            cursor: 'default',
            width: isMobile ? '100%' : 'clamp(280px, 30vw, 340px)',
            maxWidth: isMobile ? '400px' : '100%',
            position: 'relative',
            marginLeft: isMobile ? 'auto' : 0,
            marginRight: isMobile ? 'auto' : 0
          }}
          onMouseEnter={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateY(-10px)';
              e.currentTarget.style.boxShadow = '0 25px 70px rgba(139, 105, 20, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(139, 105, 20, 0.1)';
            }
          }}
          >
            <span style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: isMobile ? '15px' : 'clamp(16px, 2vw, 18px)',
              color: '#5C4033',
              fontWeight: 600,
              letterSpacing: isMobile ? '1px' : '1.5px',
              textTransform: 'uppercase',
              textAlign: 'center'
            }}>
              Total Sales
            </span>
            
            <div style={{
              width: isMobile ? '130px' : '160px',
              height: isMobile ? '130px' : '160px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Doughnut data={totalSalesChart} options={{
                ...chartOptions,
                cutout: isMobile ? '70%' : '75%'
              }} />
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
              }}>
                <span style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: isMobile ? '18px' : '22px',
                  color: '#8B6914',
                  fontWeight: 700
                }}>
                  ₹245.9K
                </span>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: isMobile ? '8px 16px' : '10px 20px',
              borderRadius: '12px',
              background: 'rgba(139, 105, 20, 0.06)',
              width: 'auto',
              justifyContent: 'center',
              alignSelf: 'center'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#8B6914',
                flexShrink: 0
              }} />
              <span style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: isMobile ? '12px' : '13px',
                color: '#5C4033',
                fontWeight: 500,
                whiteSpace: 'nowrap'
              }}>
                78% of target achieved
              </span>
            </div>
          </div>

          {/* Total Profits Chart */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            padding: isMobile ? '24px 20px' : '35px 25px',
            borderRadius: isMobile ? '16px' : '24px',
            background: 'linear-gradient(145deg, #ffffff 0%, #faf5ef 100%)',
            boxShadow: '0 10px 30px rgba(160, 82, 45, 0.1)',
            border: '1px solid rgba(160, 82, 45, 0.08)',
            transition: 'all 0.4s ease',
            cursor: 'default',
            width: isMobile ? '100%' : 'clamp(280px, 30vw, 340px)',
            maxWidth: isMobile ? '400px' : '100%',
            position: 'relative',
            marginLeft: isMobile ? 'auto' : 0,
            marginRight: isMobile ? 'auto' : 0
          }}
          onMouseEnter={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateY(-10px)';
              e.currentTarget.style.boxShadow = '0 25px 70px rgba(160, 82, 45, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(160, 82, 45, 0.1)';
            }
          }}
          >
            <span style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: isMobile ? '15px' : 'clamp(16px, 2vw, 18px)',
              color: '#5C4033',
              fontWeight: 600,
              letterSpacing: isMobile ? '1px' : '1.5px',
              textTransform: 'uppercase',
              textAlign: 'center'
            }}>
              Total Profits
            </span>
            
            <div style={{
              width: isMobile ? '130px' : '160px',
              height: isMobile ? '130px' : '160px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Doughnut data={totalProfitsChart} options={{
                ...chartOptions,
                cutout: isMobile ? '70%' : '75%'
              }} />
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
              }}>
                <span style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: isMobile ? '18px' : '22px',
                  color: '#A0522D',
                  fontWeight: 700
                }}>
                  ₹85.3K
                </span>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: isMobile ? '8px 16px' : '10px 20px',
              borderRadius: '12px',
              background: 'rgba(160, 82, 45, 0.06)',
              width: 'auto',
              justifyContent: 'center',
              alignSelf: 'center'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#A0522D',
                flexShrink: 0
              }} />
              <span style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: isMobile ? '12px' : '13px',
                color: '#5C4033',
                fontWeight: 500,
                whiteSpace: 'nowrap'
              }}>
                65% profit margin
              </span>
            </div>
          </div>

          {/* New Users Chart */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            padding: isMobile ? '24px 20px' : '35px 25px',
            borderRadius: isMobile ? '16px' : '24px',
            background: 'linear-gradient(145deg, #ffffff 0%, #faf5ef 100%)',
            boxShadow: '0 10px 30px rgba(218, 165, 32, 0.1)',
            border: '1px solid rgba(218, 165, 32, 0.08)',
            transition: 'all 0.4s ease',
            cursor: 'default',
            width: isMobile ? '100%' : 'clamp(280px, 30vw, 340px)',
            maxWidth: isMobile ? '400px' : '100%',
            position: 'relative',
            marginLeft: isMobile ? 'auto' : 0,
            marginRight: isMobile ? 'auto' : 0
          }}
          onMouseEnter={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateY(-10px)';
              e.currentTarget.style.boxShadow = '0 25px 70px rgba(218, 165, 32, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(218, 165, 32, 0.1)';
            }
          }}
          >
            <span style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: isMobile ? '15px' : 'clamp(16px, 2vw, 18px)',
              color: '#5C4033',
              fontWeight: 600,
              letterSpacing: isMobile ? '1px' : '1.5px',
              textTransform: 'uppercase',
              textAlign: 'center'
            }}>
              New Users
            </span>
            
            <div style={{
              width: isMobile ? '130px' : '160px',
              height: isMobile ? '130px' : '160px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Doughnut data={newUsersChart} options={{
                ...chartOptions,
                cutout: isMobile ? '70%' : '75%'
              }} />
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
              }}>
                <span style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: isMobile ? '18px' : '22px',
                  color: '#DAA520',
                  fontWeight: 700
                }}>
                  +1.2K
                </span>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: isMobile ? '8px 16px' : '10px 20px',
              borderRadius: '12px',
              background: 'rgba(218, 165, 32, 0.06)',
              width: 'auto',
              justifyContent: 'center',
              alignSelf: 'center'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#DAA520',
                flexShrink: 0
              }} />
              <span style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: isMobile ? '12px' : '13px',
                color: '#5C4033',
                fontWeight: 500,
                whiteSpace: 'nowrap'
              }}>
                92% growth rate
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '12px' : '20px',
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginTop: isMobile ? '10px' : '20px',
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: isMobile ? '400px' : '100%',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          <button
            style={{
              padding: isMobile ? '14px 32px' : '16px 40px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #8B6914 0%, #A0522D 100%)',
              color: 'white',
              fontFamily: "'Inter', sans-serif",
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: isMobile ? '0.5px' : '1px',
              textTransform: 'uppercase',
              boxShadow: '0 8px 25px rgba(139, 105, 20, 0.3)',
              transition: 'all 0.3s ease',
              width: isMobile ? '100%' : 'auto',
              textAlign: 'center'
            }}
            onClick={() =>
              navigate('/buyers', {
                state: { openAddBuyer: true }
              })
            }
            onMouseEnter={(e) => {
              if (!isMobile) {
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.boxShadow = '0 12px 35px rgba(139, 105, 20, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isMobile) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 8px 25px rgba(139, 105, 20, 0.3)';
              }
            }}
          >
            Add Buyer
          </button>

          <button
            style={{
              padding: isMobile ? '14px 32px' : '16px 40px',
              borderRadius: '12px',
              border: '2px solid #8B6914',
              background: 'transparent',
              color: '#8B6914',
              fontFamily: "'Inter', sans-serif",
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: isMobile ? '0.5px' : '1px',
              textTransform: 'uppercase',
              transition: 'all 0.3s ease',
              width: isMobile ? '100%' : 'auto',
              textAlign: 'center'
            }}
            onClick={() => {
              sessionStorage.setItem('orderCart', JSON.stringify({}));
              window.location.href = '/create-order';
            }}
            onMouseEnter={(e) => {
              if (!isMobile) {
                e.target.style.background = 'linear-gradient(135deg, #8B6914 0%, #A0522D 100%)';
                e.target.style.color = 'white';
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.boxShadow = '0 12px 35px rgba(139, 105, 20, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isMobile) {
                e.target.style.background = 'transparent';
                e.target.style.color = '#8B6914';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }
            }}
          >
            Create Order
          </button>
        </div>

        {/* Responsive adjustments */}
        <style>{`
          @media (max-width: 1000px) {
            .hero-cards-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }
          }

          @media (max-width: 768px) {
            .hero-cards-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              gap: 10px !important;
            }
            
            .card-overlay {
              opacity: 1 !important;
              background: linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 80%) !important;
            }
          }

          @media (max-width: 480px) {
            .hero-cards-grid {
              gap: 8px !important;
              padding: 0 4px !important;
            }
          }

          @media (max-width: 360px) {
            .hero-cards-grid {
              grid-template-columns: 1fr 1fr !important;
              gap: 6px !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

export default Homepage;
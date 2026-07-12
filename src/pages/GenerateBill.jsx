import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

import { getInvoiceById } from '../api';

function GenerateBill() {
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    fetchInvoice();
  }, [navigate]);

  const fetchInvoice = async () => {
    try {
      const id = sessionStorage.getItem('generatedBillId');
      if (!id) {
        console.error('No invoice found');
        setLoading(false);
        return;
      }
      const data = await getInvoiceById(id);
      setInvoice(data);
    } catch (err) {
      console.error('Failed to fetch invoice', err);
    } finally {
      setLoading(false);
    }
  };
  const [digitalSignature, setDigitalSignature] = useState(null);
  const billRef = useRef(null);
  const pdfBillRef = useRef(null);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  if (loading) {
    return <div style={{ padding: '80px', textAlign: 'center', fontFamily: 'Inter' }}>Loading Invoice...</div>;
  }

  if (!invoice) {
    return <div style={{ padding: '80px', textAlign: 'center', fontFamily: 'Inter' }}>No invoice data found. Please create an order first.</div>;
  }

  const billNo = invoice.invoiceNumber;
  const billDate = new Date(invoice.invoiceDate).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  }) : '-';

  const cartItems = invoice.items || [];
  const subtotal = invoice.subTotal || 0;
  const gst = invoice.totalGst || 0;
  const grandTotal = invoice.grandTotal || 0;

  const companyInfo = {
    name: invoice.companySnapshot?.companyName || 'Company Name',
    address: invoice.companySnapshot?.address || '',
    city: '',
    phone: invoice.companySnapshot?.phone || '',
    email: invoice.companySnapshot?.email || '',
    gstin: invoice.companySnapshot?.gstin || '',
    pan: ''
  };

  const buyerInfo = {
    name: invoice.customerSnapshot?.partyName || 'Customer',
    address: invoice.customerSnapshot?.billingAddress || '',
    city: '',
    gstin: invoice.customerSnapshot?.gstin || ''
  };

  // Signature Pad Functions
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    setIsDrawing(true);
    
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    if (clientX === undefined) return;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    if (clientX === undefined) return;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDigitalSignature(null);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    setDigitalSignature(dataUrl);
    setShowSignaturePad(false);
  };

  // Generate PDF from dedicated A4 clone
  const handleDownloadPDF = async () => {
    try {
      // Get the PDF bill element
      const pdfElement = pdfBillRef.current;
      if (!pdfElement) {
        console.error('PDF bill element not found');
        return;
      }

      // Temporarily show PDF element for capture
      pdfElement.style.display = 'block';
      pdfElement.style.position = 'absolute';
      pdfElement.style.left = '-9999px';
      pdfElement.style.top = '0';

      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(pdfElement, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
        height: pdfElement.scrollHeight,
        windowWidth: 794,
        windowHeight: pdfElement.scrollHeight
      });

      // Hide PDF element again
      pdfElement.style.display = 'none';

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      let imgY = 0;
      let scaledHeight = imgHeight * ratio;
      
      pdf.addImage(imgData, 'JPEG', imgX, imgY, pdfWidth, scaledHeight);
      
      // Handle multi-page
      let heightLeft = scaledHeight - pdfHeight;
      let pageNum = 1;
      
      while (heightLeft > 0) {
        pageNum++;
        imgY = -(pdfHeight * (pageNum - 1));
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', imgX, imgY, pdfWidth, scaledHeight);
        heightLeft -= pdfHeight;
      }
      
      pdf.save(`Invoice_${billNo}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      // Fallback
      try {
        window.print();
      } catch {
        alert('Failed to generate PDF. Please try again.');
      }
    }
  };

  const handleDownloadDoc = () => {
    const content = billRef.current.innerHTML;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=794">
          <title>Invoice ${billNo}</title>
          <style>
            @page {
              size: A4;
              margin: 0;
            }
            body { 
              font-family: 'Times New Roman', Times, serif; 
              padding: 40px; 
              color: #333; 
              line-height: 1.6;
              width: 794px;
              margin: 0 auto;
              background: white;
            }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { border: 1px solid #000; padding: 8px 12px; text-align: left; font-size: 12px; }
            th { background: #f5f5f5; font-weight: bold; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 15px; }
            .header h1 { font-size: 24px; margin: 0 0 5px 0; letter-spacing: 2px; }
            .header p { margin: 3px 0; font-size: 12px; }
            .invoice-title { text-align: center; font-size: 20px; font-weight: bold; letter-spacing: 3px; text-transform: uppercase; margin: 15px 0; }
            .bill-details td { border: none; vertical-align: top; padding: 5px; font-size: 12px; }
            .summary-section { display: flex; justify-content: space-between; margin-bottom: 25px; }
            .footer { margin-top: 40px; display: flex; justify-content: space-between; border-top: 2px solid #000; padding-top: 20px; }
            .signature-line { width: 180px; height: 1px; background: #000; margin-top: 30px; }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `;
    
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_${billNo}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const shareData = {
      title: `Invoice ${billNo} - AQUA Sanitary Solutions`,
      text: `Invoice Total: ₹${grandTotal.toFixed(2)}\nBuyer: ${buyerInfo.name}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
      alert('Invoice details copied to clipboard!');
    }
  };

  if (cartItems.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
        <Navbar />
        <div style={{
          padding: '120px 20px 40px',
          textAlign: 'center'
        }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", color: '#2C1810', fontSize: '24px' }}>
            No Items to Generate Bill
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", color: '#64748b', margin: '16px 0' }}>
            Please add items to cart first
          </p>
          <a
            href="/create-order"
            style={{
              padding: '12px 32px',
              borderRadius: '10px',
              background: '#8B6914',
              color: 'white',
              textDecoration: 'none',
              fontFamily: "'Inter', sans-serif",
              fontSize: '14px',
              fontWeight: 600,
              display: 'inline-block'
            }}
          >
            Go to Orders
          </a>
        </div>
      </div>
    );
  }

  // Bill Content Component (reused for both preview and PDF)
  const BillContent = ({ isPdfVersion = false }) => (
    <div
      className={`bill-content ${isPdfVersion ? 'pdf-version' : ''}`}
      style={{
        background: 'white',
        padding: isPdfVersion ? '40px 45px' : '30px 40px 40px',
        boxShadow: isPdfVersion ? 'none' : '0 10px 40px rgba(0,0,0,0.08)',
        fontFamily: "'Times New Roman', Times, serif",
        color: '#333',
        fontSize: '12px',
        lineHeight: '1.5',
        width: isPdfVersion ? '794px' : '100%',
        boxSizing: 'border-box',
        margin: isPdfVersion ? '0' : '0 auto'
      }}
    >
      {/* Header */}
      <div style={{
        textAlign: 'center',
        borderBottom: '2px solid #000',
        paddingBottom: '15px',
        marginBottom: '15px'
      }}>
        <h1 style={{
          fontSize: isPdfVersion ? '24px' : '22px',
          fontWeight: 'bold',
          letterSpacing: '2px',
          margin: '0 0 5px 0',
          color: '#000'
        }}>
          {companyInfo.name}
        </h1>
        <p style={{ margin: '3px 0', fontSize: '12px', color: '#555' }}>
          {companyInfo.address}
        </p>
        <p style={{ margin: '3px 0', fontSize: '12px', color: '#555' }}>
          {companyInfo.city}
        </p>
        <p style={{ margin: '3px 0', fontSize: '12px', color: '#555' }}>
          Phone: {companyInfo.phone} | Email: {companyInfo.email}
        </p>
        <p style={{ margin: '3px 0', fontSize: '12px', color: '#555' }}>
          GSTIN: {companyInfo.gstin} | PAN: {companyInfo.pan}
        </p>
      </div>

      {/* Tax Invoice Title */}
      <div style={{
        textAlign: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{
          fontSize: isPdfVersion ? '20px' : '18px',
          fontWeight: 'bold',
          letterSpacing: '3px',
          textTransform: 'uppercase',
          margin: 0,
          color: '#000'
        }}>
          Tax Invoice
        </h2>
      </div>

      {/* Bill To and Invoice Details */}
      <table className="bill-details-table" style={{
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '25px',
        borderBottom: '1px dashed #000',
        paddingBottom: '15px'
      }}>
        <tbody>
          <tr className="bill-details-row">
            <td className="bill-to-cell" style={{
              border: 'none',
              padding: '0 10px 15px 0',
              verticalAlign: 'top',
              width: '50%'
            }}>
              <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                Bill To:
              </h3>
              <p style={{ margin: '2px 0', fontSize: '12px', fontWeight: 'bold' }}>
                {buyerInfo.name}
              </p>
              <p style={{ margin: '2px 0', fontSize: '11px', color: '#555' }}>
                {buyerInfo.address}
              </p>
              <p style={{ margin: '2px 0', fontSize: '11px', color: '#555' }}>
                {buyerInfo.city}
              </p>
              <p style={{ margin: '2px 0', fontSize: '11px', color: '#555' }}>
                GSTIN: {buyerInfo.gstin}
              </p>
            </td>
            <td className="invoice-info-cell" style={{
              border: 'none',
              padding: '0 0 15px 0',
              verticalAlign: 'top',
              textAlign: 'right'
            }}>
              <table style={{ border: 'none', width: 'auto', marginLeft: 'auto' }}>
                <tbody>
                  <tr>
                    <td style={{ border: 'none', padding: '2px 10px 2px 0', fontWeight: 'bold', fontSize: '11px', textAlign: 'right' }}>Invoice No:</td>
                    <td style={{ border: 'none', padding: '2px 0', fontSize: '11px' }}>{billNo}</td>
                  </tr>
                  <tr>
                    <td style={{ border: 'none', padding: '2px 10px 2px 0', fontWeight: 'bold', fontSize: '11px', textAlign: 'right' }}>Date:</td>
                    <td style={{ border: 'none', padding: '2px 0', fontSize: '11px' }}>{billDate}</td>
                  </tr>
                  <tr>
                    <td style={{ border: 'none', padding: '2px 10px 2px 0', fontWeight: 'bold', fontSize: '11px', textAlign: 'right' }}>Due Date:</td>
                    <td style={{ border: 'none', padding: '2px 0', fontSize: '11px' }}>{dueDate}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Items Table */}
      <div style={{ overflowX: 'auto', marginBottom: '25px' }}>
        <table className="items-table" style={{
          width: '100%',
          borderCollapse: 'collapse',
          minWidth: '500px'
        }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #000', padding: '8px', background: '#f5f5f5', fontSize: '11px', fontWeight: 'bold', textAlign: 'center', width: '40px' }}>S.No</th>
              <th style={{ border: '1px solid #000', padding: '8px', background: '#f5f5f5', fontSize: '11px', fontWeight: 'bold', textAlign: 'left' }}>Description</th>
              <th style={{ border: '1px solid #000', padding: '8px', background: '#f5f5f5', fontSize: '11px', fontWeight: 'bold', textAlign: 'center', width: '60px' }}>HSN</th>
              <th style={{ border: '1px solid #000', padding: '8px', background: '#f5f5f5', fontSize: '11px', fontWeight: 'bold', textAlign: 'center', width: '50px' }}>Qty</th>
              <th style={{ border: '1px solid #000', padding: '8px', background: '#f5f5f5', fontSize: '11px', fontWeight: 'bold', textAlign: 'right', width: '90px' }}>Rate</th>
              <th style={{ border: '1px solid #000', padding: '8px', background: '#f5f5f5', fontSize: '11px', fontWeight: 'bold', textAlign: 'right', width: '90px' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {cartItems.map((item, index) => (
              <tr key={item.id}>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11px' }}>{index + 1}</td>
                <td style={{ border: '1px solid #000', padding: '8px', fontSize: '11px' }}>
                  <div style={{ fontWeight: '500' }}>{item.productName}</div>
                  <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>Model: #{item.model}</div>
                </td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '10px' }}>7324</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11px' }}>{item.quantity}</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontSize: '11px' }}>{parseFloat(item.rate).toFixed(2)}</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontSize: '11px', fontWeight: '500' }}>
                  {(item.quantity * parseFloat(item.rate)).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Section */}
      <div className="summary-section" style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '25px',
        gap: '20px',
        flexWrap: 'wrap'
      }}>
        <div className="amount-words" style={{ flex: '1 1 300px', minWidth: '250px' }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
            Amount Chargeable (in words):
          </p>
          <p style={{
            fontSize: '11px',
            fontStyle: 'italic',
            color: '#555',
            borderTop: '1px solid #000',
            paddingTop: '8px',
            lineHeight: '1.4'
          }}>
            {invoice.totalInWords}
          </p>
          <p style={{ fontSize: '9px', color: '#888', marginTop: '10px', fontStyle: 'italic' }}>
            * This is a computer generated invoice
          </p>
        </div>

        <div className="totals-section" style={{ width: '280px', flexShrink: 0 }}>
          <table className="totals-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #000', padding: '8px 12px', fontSize: '12px', fontWeight: '600', background: '#fafafa' }}>Subtotal</td>
                <td style={{ border: '1px solid #000', padding: '8px 12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', background: '#fafafa' }}>
                  &#8377; {subtotal.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '8px 12px', fontSize: '12px', background: '#fafafa' }}>IGST @ 5%</td>
                <td style={{ border: '1px solid #000', padding: '8px 12px', textAlign: 'right', fontSize: '12px', background: '#fafafa' }}>
                  &#8377; {gst.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td style={{ border: '2px solid #000', padding: '10px 12px', fontSize: '14px', fontWeight: 'bold', background: '#f0f0f0' }}>Grand Total</td>
                <td style={{ border: '2px solid #000', padding: '10px 12px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold', background: '#f0f0f0' }}>
                  &#8377; {grandTotal.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Terms and Conditions */}
      <div style={{ borderTop: '1px dashed #000', paddingTop: '15px', marginTop: '10px' }}>
        <h3 style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 10px 0' }}>
          Terms & Conditions:
        </h3>
        <div style={{ fontSize: '11px', color: '#555', lineHeight: '1.8' }}>
          <p style={{ margin: '0 0 4px 0' }}>Goods once sold will not be taken back or exchanged.</p>
          <p style={{ margin: '0 0 4px 0' }}>Payment is due within 15 days from the date of invoice.</p>
          <p style={{ margin: '0 0 4px 0' }}>Interest @ 18% p.a. will be charged on delayed payments.</p>
          <p style={{ margin: 0 }}>Subject to Delhi jurisdiction only.</p>
        </div>
      </div>

      {/* Footer with Digital Signature */}
      <div className="bill-footer" style={{
        marginTop: '40px',
        display: 'flex',
        justifyContent: 'space-between',
        borderTop: '2px solid #000',
        paddingTop: '20px',
        gap: '20px'
      }}>
        <div className="signature-block">
          <p style={{ fontSize: '11px', fontWeight: 'bold', margin: '0 0 5px 0' }}>
            Customer Signature
          </p>
          <div style={{ width: '180px', height: '1px', background: '#000', marginTop: '30px' }} className="signature-line" />
        </div>
        <div className="signature-block" style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '11px', fontWeight: 'bold', margin: '0 0 5px 0' }}>
            For {companyInfo.name}
          </p>
          {digitalSignature ? (
            <img 
              src={digitalSignature} 
              alt="Digital Signature" 
              style={{ width: '180px', height: '60px', objectFit: 'contain', marginTop: '5px', marginLeft: 'auto', display: 'block' }} 
            />
          ) : (
            <div style={{ width: '180px', height: '1px', background: '#000', marginTop: '30px', marginLeft: 'auto' }} className="signature-line" />
          )}
          <p style={{ fontSize: '10px', marginTop: '5px', color: '#555' }}>
            Authorised Signatory
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f0f0f0' }}>
      <Navbar />
      
      {/* Hidden A4 PDF Version - This is what gets captured for PDF */}
      <div 
        ref={pdfBillRef}
        style={{
          display: 'none',
          position: 'absolute',
          left: '-9999px',
          top: 0,
          width: '794px',
          background: 'white',
          zIndex: -1
        }}
      >
        <BillContent isPdfVersion={true} />
      </div>
      
      {/* Action Buttons - Responsive */}
      <div 
        className="action-buttons no-print"
        style={{
          position: 'fixed',
          top: '80px',
          right: '30px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          zIndex: 100
        }}
      >
        <button
          onClick={() => setShowSignaturePad(true)}
          style={{
            padding: '12px 24px',
            borderRadius: '10px',
            border: 'none',
            background: '#7c3aed',
            color: 'white',
            fontFamily: "'Inter', sans-serif",
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 15px rgba(124,58,237,0.3)',
            whiteSpace: 'nowrap'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M3 17v3h3l11-11-3-3L3 17z"/>
            <path d="M16 2l3 3-3 3-3-3 3-3z"/>
          </svg>
          <span className="btn-text">Signature</span>
        </button>
        
        <button
          onClick={handleDownloadPDF}
          style={{
            padding: '12px 24px',
            borderRadius: '10px',
            border: 'none',
            background: '#dc2626',
            color: 'white',
            fontFamily: "'Inter', sans-serif",
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 15px rgba(220,38,38,0.3)',
            whiteSpace: 'nowrap'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          <span className="btn-text">PDF</span>
        </button>
        
        <button
          onClick={handleDownloadDoc}
          style={{
            padding: '12px 24px',
            borderRadius: '10px',
            border: 'none',
            background: '#2563eb',
            color: 'white',
            fontFamily: "'Inter', sans-serif",
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 15px rgba(37,99,235,0.3)',
            whiteSpace: 'nowrap'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <span className="btn-text">DOC</span>
        </button>
        
        <button
          onClick={handleShare}
          style={{
            padding: '12px 24px',
            borderRadius: '10px',
            border: 'none',
            background: '#059669',
            color: 'white',
            fontFamily: "'Inter', sans-serif",
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 15px rgba(5,150,105,0.3)',
            whiteSpace: 'nowrap'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          <span className="btn-text">Share</span>
        </button>
      </div>

      {/* Signature Pad Modal */}
      {showSignaturePad && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }} className="no-print">
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '30px',
            width: '500px',
            maxWidth: '100%',
            textAlign: 'center'
          }}>
            <h3 style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '18px',
              fontWeight: 600,
              color: '#2C1810',
              margin: '0 0 20px 0'
            }}>
              Digital Signature
            </h3>
            
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '13px',
              color: '#5C4033',
              margin: '0 0 15px 0'
            }}>
              Draw your authorised signatory signature below
            </p>
            
            <div style={{
              border: '2px dashed #ccc',
              borderRadius: '12px',
              overflow: 'hidden',
              marginBottom: '20px',
              background: '#fafafa'
            }}>
              <canvas
                ref={canvasRef}
                width={440}
                height={200}
                style={{
                  width: '100%',
                  height: '200px',
                  cursor: 'crosshair'
                }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>

            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '12px',
              color: '#64748b',
              margin: '0 0 20px 0'
            }}>
              Use mouse or touch to draw your signature
            </p>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={clearSignature}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: 'white',
                  color: '#5C4033',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
              <button
                onClick={() => setShowSignaturePad(false)}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: 'white',
                  color: '#5C4033',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveSignature}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#7c3aed',
                  color: 'white',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Apply Signature
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Container - Preview */}
      <div 
        className="bill-container"
        style={{
          padding: '100px 40px 40px',
          maxWidth: '800px',
          margin: '0 auto'
        }}
      >
        <div ref={billRef}>
          <BillContent isPdfVersion={false} />
        </div>
      </div>

      <style>{`
        @media print {
          .no-print, .action-buttons {
            display: none !important;
          }
          nav, .navbar, [class*="navbar"] {
            display: none !important;
          }
          .bill-container {
            padding: 0 !important;
            max-width: 100% !important;
          }
          .bill-content {
            box-shadow: none !important;
            padding: 20px !important;
            margin: 0 !important;
            font-size: 11px !important;
          }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }

        @media (max-width: 900px) {
          .bill-container {
            padding: 90px 20px 30px !important;
          }
          .action-buttons {
            position: fixed !important;
            top: auto !important;
            bottom: 20px !important;
            right: 20px !important;
            flex-direction: row !important;
            gap: 8px !important;
            flex-wrap: wrap;
            justify-content: flex-end;
          }
          .action-buttons button {
            padding: 10px 16px !important;
            font-size: 12px !important;
          }
          .btn-text {
            display: inline !important;
          }
        }

        @media (max-width: 768px) {
          .bill-container {
            padding: 80px 10px 80px !important;
          }
          .bill-content {
            padding: 20px 15px 25px !important;
            font-size: 11px !important;
          }
          .bill-content h1 {
            font-size: 16px !important;
            letter-spacing: 1px !important;
          }
          .bill-content h2 {
            font-size: 14px !important;
            letter-spacing: 2px !important;
          }
          .bill-content p {
            font-size: 10px !important;
          }
          
          .bill-details-row {
            display: flex !important;
            flex-direction: column !important;
          }
          .bill-to-cell {
            width: 100% !important;
          }
          .invoice-info-cell {
            text-align: left !important;
            width: 100% !important;
            padding-top: 10px !important;
            border-top: 1px solid #eee !important;
          }
          .invoice-info-cell table {
            margin-left: 0 !important;
            width: 100% !important;
          }
          .invoice-info-cell td {
            text-align: left !important;
          }
          
          .summary-section {
            flex-direction: column !important;
            gap: 25px !important;
          }
          .amount-words {
            width: 100% !important;
            flex: none !important;
          }
          .totals-section {
            width: 100% !important;
          }
          
          .bill-footer {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 30px !important;
          }
          .signature-block {
            text-align: left !important;
            width: 100% !important;
          }
          .signature-block div,
          .signature-block img {
            margin-left: 0 !important;
            margin-right: auto !important;
          }
          
          .items-table {
            font-size: 10px !important;
          }
          .items-table th,
          .items-table td {
            padding: 6px 4px !important;
          }
        }

        @media (max-width: 480px) {
          .bill-container {
            padding: 70px 8px 70px !important;
          }
          .bill-content {
            padding: 15px 12px 20px !important;
          }
          .bill-content h1 {
            font-size: 14px !important;
          }
          .bill-content h2 {
            font-size: 12px !important;
          }
          .bill-details-table h3 {
            font-size: 11px !important;
          }
          .items-table th,
          .items-table td {
            font-size: 9px !important;
            padding: 5px 3px !important;
          }
          .totals-table td {
            font-size: 11px !important;
            padding: 6px 8px !important;
          }
          .action-buttons {
            left: 10px !important;
            right: 10px !important;
            bottom: 10px !important;
            justify-content: center !important;
          }
          .action-buttons button {
            flex: 1 !important;
            padding: 10px 8px !important;
            font-size: 11px !important;
            min-width: 0 !important;
          }
          .btn-text {
            font-size: 10px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default GenerateBill;
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import Navbar from '../components/Navbar';
import { API_BASE_URL } from '../services/api';

function InvoiceDetail() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();

  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [digitalSignature, setDigitalSignature] = useState(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const billRef = useRef(null);
  const pdfBillRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    fetchInvoice();
  }, [invoiceId, navigate]);

  const fetchInvoice = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/Invoices/${invoiceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.status === 404) {
        navigate('/invoices');
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to load invoice');
      }
      const result = await response.json();
      setTransaction(result.data || result);
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: "'Inter', sans-serif", color: '#7b6d60', fontSize: '15px' }}>Loading invoice...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f0f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <p style={{ fontFamily: "'Inter', sans-serif", color: '#dc2626', fontSize: '14px' }}>{fetchError}</p>
        <button onClick={() => navigate('/invoices')} style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid #ddd7cc', background: 'white', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>Back to Invoices</button>
      </div>
    );
  }

  if (!transaction) return null;

  // Map API fields
  const company = transaction.companySnapshot || {};
  const buyer = transaction.customerSnapshot || {};

  const companyName = company.name || company.companyName || 'AQUA SANITARY SOLUTIONS';
  const companyAddress = company.address || '123, Industrial Area, Sector 12 | New Delhi - 110001, India';
  const companyPhone = company.phone || '+91 98765 43210';
  const companyEmail = company.email || 'info@aquasanitary.com';
  const companyGstin = company.gstin || '07AABCU9603R1Z8';
  const companyPan = company.pan || company.panNumber || 'AABCU9603R';

  const buyerName = buyer.partyName || transaction.partyName || '';
  const buyerAddress = buyer.billingAddress || transaction.billingAddress || '';
  const buyerPhone = buyer.phone || transaction.phone || '';
  const buyerGstin = buyer.gstin || transaction.partyGstin || '';

  const invoiceNumber = transaction.invoiceNumber || '';
  const invoiceDate = transaction.invoiceDate || '';
  const invoiceStatus = (transaction.status || 'pending').toLowerCase();
  const items = transaction.items || [];

  const subtotal = transaction.subTotal || 0;
  const gstAmount = transaction.totalGst || 0;
  const grandTotal = transaction.grandTotal || 0;
  const amountInWords = transaction.totalInWords || numberToWords(grandTotal);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-IN', options);
  };

  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero';
    
    const convert = (n) => {
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
      if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
      if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
      return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
    };
    
    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);
    
    let result = 'Rupees ' + convert(rupees);
    if (paise > 0) {
      result += ' and ' + convert(paise) + ' Paise';
    }
    return result + ' Only';
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
      
      pdf.save(`Invoice_${invoiceNumber}.pdf`);
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

  // Download DOC
  const handleDownloadDoc = () => {
    const content = billRef.current.innerHTML;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=794">
          <title>Invoice ${transaction.invoiceId}</title>
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
    a.download = `Invoice_${invoiceNumber}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Share
  const handleShare = async () => {
    const shareData = {
      title: `Invoice ${invoiceNumber} - ${companyName}`,
      text: `Invoice Total: ${formatCurrency(grandTotal)}\nBuyer: ${buyerName}`,
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
          {companyName}
        </h1>
        <p style={{ margin: '3px 0', fontSize: '12px', color: '#555' }}>
          {companyAddress}
        </p>
        <p style={{ margin: '3px 0', fontSize: '12px', color: '#555' }}>
          Phone: {companyPhone} | Email: {companyEmail}
        </p>
        <p style={{ margin: '3px 0', fontSize: '12px', color: '#555' }}>
          GSTIN: {companyGstin} | PAN: {companyPan}
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
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '25px',
        borderBottom: '1px dashed #000',
        paddingBottom: '15px'
      }}>
        <tbody>
          <tr className="bill-to-row">
            <td className="bill-to-cell" style={{
              border: 'none',
              padding: '0 10px 15px 0',
              verticalAlign: 'top',
              width: '50%'
            }}>
              <h3 style={{
                fontSize: '13px',
                fontWeight: 'bold',
                margin: '0 0 8px 0'
              }}>
                Bill To:
              </h3>
              <p style={{ margin: '2px 0', fontSize: '12px', fontWeight: 'bold' }}>
                {buyerName}
              </p>
              <p style={{ margin: '2px 0', fontSize: '11px', color: '#555' }}>
                {buyerAddress}
              </p>
              <p style={{ margin: '2px 0', fontSize: '11px', color: '#555' }}>
                Phone: {buyerPhone}
              </p>
              <p style={{ margin: '2px 0', fontSize: '11px', color: '#555' }}>
                GSTIN: {buyerGstin}
              </p>
            </td>
            <td className="invoice-meta-cell" style={{
              border: 'none',
              padding: '0 0 15px 0',
              verticalAlign: 'top',
              textAlign: 'right'
            }}>
              <table className="invoice-meta-table" style={{ border: 'none', width: 'auto', marginLeft: 'auto' }}>
                <tbody>
                  <tr>
                    <td style={{ border: 'none', padding: '2px 10px 2px 0', fontWeight: 'bold', fontSize: '11px', textAlign: 'right' }}>Invoice No:</td>
                    <td style={{ border: 'none', padding: '2px 0', fontSize: '11px' }}>{invoiceNumber}</td>
                  </tr>
                  <tr>
                    <td style={{ border: 'none', padding: '2px 10px 2px 0', fontWeight: 'bold', fontSize: '11px', textAlign: 'right' }}>Date:</td>
                    <td style={{ border: 'none', padding: '2px 0', fontSize: '11px' }}>{formatDate(invoiceDate)}</td>
                  </tr>
                  <tr>
                    <td style={{ border: 'none', padding: '2px 10px 2px 0', fontWeight: 'bold', fontSize: '11px', textAlign: 'right' }}>Status:</td>
                    <td style={{ border: 'none', padding: '2px 0', fontSize: '11px', fontWeight: 'bold', color: invoiceStatus === 'paid' ? '#166534' : invoiceStatus === 'due' ? '#92400e' : '#9d174d' }}>
                      {invoiceStatus.toUpperCase()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Items Table */}
      <div style={{ overflowX: 'auto', marginBottom: '25px' }}>
        <table style={{
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
            {items.map((item, index) => {
              const itemName = item.productName || item.name || item.description || '';
              const itemModel = item.hsnCode || item.model || '';
              const itemQty = item.quantity || 0;
              const itemRate = item.rate || item.unitPrice || item.price || 0;
              const itemAmount = item.amount || (itemQty * itemRate);
              return (
              <tr key={index}>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11px' }}>{index + 1}</td>
                <td style={{ border: '1px solid #000', padding: '8px', fontSize: '11px' }}>
                  <div style={{ fontWeight: '500' }}>{itemName}</div>
                  {itemModel && <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>Model: #{itemModel}</div>}
                </td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '10px' }}>{item.hsnCode || '7324'}</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11px' }}>{itemQty}</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontSize: '11px' }}>{itemRate.toFixed(2)}</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontSize: '11px', fontWeight: '500' }}>{itemAmount.toFixed(2)}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '25px',
        gap: '20px',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: '1 1 300px', minWidth: '250px' }}>
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
            {amountInWords}
          </p>
          <p style={{ fontSize: '9px', color: '#888', marginTop: '10px', fontStyle: 'italic' }}>
            * This is a computer generated invoice
          </p>
        </div>
        <div className="summary-totals" style={{ width: '280px', flexShrink: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #000', padding: '8px 12px', fontSize: '12px', fontWeight: '600', background: '#fafafa' }}>Subtotal</td>
                <td style={{ border: '1px solid #000', padding: '8px 12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', background: '#fafafa' }}>
                  &#8377; {subtotal.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '8px 12px', fontSize: '12px', background: '#fafafa' }}>GST</td>
                <td style={{ border: '1px solid #000', padding: '8px 12px', textAlign: 'right', fontSize: '12px', background: '#fafafa' }}>
                  &#8377; {gstAmount.toFixed(2)}
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
        <h3 style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 10px 0' }}>Terms & Conditions:</h3>
        <div style={{ fontSize: '11px', color: '#555', lineHeight: '1.8' }}>
          <p style={{ margin: '0 0 4px 0' }}>Goods once sold will not be taken back or exchanged.</p>
          <p style={{ margin: '0 0 4px 0' }}>Payment is due within 15 days from the date of invoice.</p>
          <p style={{ margin: '0 0 4px 0' }}>Interest @ 18% p.a. will be charged on delayed payments.</p>
          <p style={{ margin: 0 }}>Subject to Delhi jurisdiction only.</p>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '40px',
        display: 'flex',
        justifyContent: 'space-between',
        borderTop: '2px solid #000',
        paddingTop: '20px',
        gap: '20px'
      }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: 'bold', margin: '0 0 5px 0' }}>Customer Signature</p>
          <div style={{ width: '180px', height: '1px', background: '#000', marginTop: '30px' }} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '11px', fontWeight: 'bold', margin: '0 0 5px 0' }}>For {companyName}</p>
          {digitalSignature ? (
            <img 
              src={digitalSignature} 
              alt="Digital Signature" 
              style={{
                width: '180px',
                height: '60px',
                objectFit: 'contain',
                marginTop: '5px',
                marginLeft: 'auto',
                display: 'block'
              }} 
            />
          ) : (
            <div style={{
              width: '180px',
              height: '1px',
              background: '#000',
              marginTop: '30px',
              marginLeft: 'auto'
            }} />
          )}
          <p style={{ fontSize: '10px', marginTop: '5px', color: '#555' }}>Authorised Signatory</p>
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
      
      {/* Action Buttons */}
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

      {/* Back Button */}
      <div
        className="invoice-back-btn-area"
        style={{ 
          padding: '90px 40px 0',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
        <button
          onClick={() => navigate('/invoices')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid #ddd7cc',
            background: 'white',
            color: '#8B6914',
            fontSize: '13px',
            fontWeight: 500,
            fontFamily: "'Inter', sans-serif",
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '20px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.background = '#f5f3ee'}
          onMouseLeave={(e) => e.target.style.background = 'white'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B6914" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          Back to Invoices
        </button>
      </div>

      {/* Invoice Detail - Preview */}
      <div 
        className="invoice-detail"
        style={{
          padding: '0 40px 40px',
          maxWidth: '800px',
          margin: '0 auto'
        }}
      >
        <div ref={billRef}>
          <BillContent isPdfVersion={false} />
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }

        @media print {
          .no-print, .action-buttons {
            display: none !important;
          }
          nav, .navbar, [class*="navbar"] {
            display: none !important;
          }
          .invoice-detail {
            padding: 0 !important;
            max-width: 100% !important;
          }
          .invoice-back-btn-area {
            display: none !important;
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

        /* ===== TABLET ===== */
        @media (max-width: 900px) {
          .invoice-back-btn-area {
            padding: 80px 20px 0 !important;
          }
          .invoice-detail {
            padding: 0 20px 130px !important;
          }
          .action-buttons {
            position: fixed !important;
            top: auto !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            flex-direction: row !important;
            gap: 0 !important;
            flex-wrap: nowrap !important;
            background: white !important;
            border-top: 1px solid #e5e0d8 !important;
            padding: 10px 12px !important;
            box-shadow: 0 -4px 20px rgba(0,0,0,.1) !important;
            z-index: 200 !important;
          }
          .action-buttons button {
            flex: 1 !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 4px !important;
            padding: 8px 4px !important;
            font-size: 10px !important;
            border-radius: 8px !important;
            white-space: nowrap !important;
            box-shadow: none !important;
          }
        }

        /* ===== MOBILE ===== */
        @media (max-width: 768px) {
          .invoice-back-btn-area {
            padding: 74px 12px 0 !important;
          }
          .invoice-detail {
            padding: 0 12px 130px !important;
          }
          .bill-content {
            padding: 16px 14px 22px !important;
          }
          .bill-content h1 {
            font-size: 15px !important;
            letter-spacing: 1px !important;
          }
          .bill-content h2 {
            font-size: 13px !important;
          }

          /* Stack Bill To / Invoice meta on mobile */
          .bill-to-row {
            display: block !important;
          }
          .bill-to-cell {
            display: block !important;
            width: 100% !important;
            padding: 0 0 12px 0 !important;
          }
          .invoice-meta-cell {
            display: block !important;
            width: 100% !important;
            text-align: left !important;
            padding: 12px 0 0 0 !important;
            border-top: 1px dashed #ccc !important;
          }
          .invoice-meta-table {
            margin-left: 0 !important;
            width: 100% !important;
          }
          .invoice-meta-cell td {
            text-align: left !important;
          }

          /* Make summary totals full-width */
          .summary-totals {
            width: 100% !important;
          }
        }

        /* ===== SMALL MOBILE ===== */
        @media (max-width: 480px) {
          .invoice-back-btn-area {
            padding: 72px 8px 0 !important;
          }
          .invoice-detail {
            padding: 0 8px 120px !important;
          }
          .bill-content {
            padding: 14px 10px 18px !important;
          }
          .bill-content h1 {
            font-size: 13px !important;
          }
          .action-buttons button span.btn-text {
            font-size: 9px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default InvoiceDetail;
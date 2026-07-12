import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import Navbar from '../components/Navbar';
import { API_BASE_URL } from '../services/api';

function Invoices() {
  const navigate = useNavigate();
  const [selectedBuyer, setSelectedBuyer] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [isExporting, setIsExporting] = useState(false);

  // API States
  const [transactions, setTransactions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    fetchCustomers();
    fetchInvoices();
  }, [navigate]);

  // Fetch Customers API
  const fetchCustomers = async () => {
    try {
      const token = sessionStorage.getItem("token");
      if (!token) {
        setError("Authentication token not found");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/Customers`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch customers: ${response.statusText}`);
      }

      const data = await response.json();
      const list = Array.isArray(data?.data) ? data.data : [];
      setCustomers(list);
    } catch (err) {
      setError(`Error fetching customers: ${err.message}`);
      console.error("Fetch customers error:", err);
    }
  };

  // Fetch Invoices API
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("token");
      if (!token) {
        setError("Authentication token not found");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/Invoices`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch invoices: ${response.statusText}`);
      }

      const data = await response.json();
      const raw = Array.isArray(data?.data?.data) ? data.data.data : [];

      // Map API response to UI structure
      const mappedTransactions = raw.map((invoice, index) => ({
        id: invoice.id || index,
        invoiceId: invoice.invoiceNumber || "",
        buyerName: invoice.partyName || "",
        date: invoice.invoiceDate || "",
        address: invoice.billingAddress || "-",
        phone: invoice.phone || "-",
        amount: invoice.grandTotal || 0,
        status: (invoice.status || "pending").toLowerCase()
      }));

      setTransactions(mappedTransactions);
      setError("");
    } catch (err) {
      setError(`Error fetching invoices: ${err.message}`);
      console.error("Fetch invoices error:", err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter transactions based on selected criteria
  useEffect(() => {
    let filtered = [...transactions];

    if (selectedBuyer) {
      filtered = filtered.filter((t) => t.buyerName === selectedBuyer);
    }

    if (selectedDate) {
      filtered = filtered.filter((t) => t.date.slice(0, 10) === selectedDate);
    }

    if (invoiceNumber) {
      const q = invoiceNumber.toLowerCase();
      filtered = filtered.filter((t) =>
        t.invoiceId.toLowerCase().includes(q)
      );
    }

    setFilteredTransactions(filtered);
  }, [selectedBuyer, selectedDate, invoiceNumber, transactions]);

  const handleInvoiceClick = (transaction) => {
    navigate(`/invoice/${transaction.id}`);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-IN', options);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return { bg: '#dcfce7', color: '#166534' };
      case 'due':
        return { bg: '#fef3c7', color: '#92400e' };
      case 'pending':
        return { bg: '#fce7f3', color: '#9d174d' };
      default:
        return { bg: '#f3f4f6', color: '#374151' };
    }
  };

  const exportCSV = () => {
    setIsExporting(true);

    const headers = ['Invoice ID', 'Buyer Name', 'Date', 'Address', 'Phone', 'Amount', 'Status'];
    const csvData = filteredTransactions.map((t) => [
      t.invoiceId,
      t.buyerName,
      formatDate(t.date),
      t.address,
      t.phone,
      formatCurrency(t.amount),
      t.status.toUpperCase()
    ]);

    const escapeCSV = (value) => `"${String(value).replace(/"/g, '""')}"`;

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...csvData.map((row) => row.map(escapeCSV).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `invoices_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsExporting(false);
  };

  const downloadPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');

    const margin = 12;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const tableWidth = pageWidth - margin * 2;

    const columns = [
      { header: 'Invoice ID', width: 28 },
      { header: 'Buyer Name', width: 48 },
      { header: 'Date', width: 28 },
      { header: 'Address', width: 52 },
      { header: 'Phone No.', width: 36 },
      { header: 'Amount', width: 28 },
      { header: 'Status', width: 24 },
    ];

    const lineHeight = 5;
    const headerHeight = 10;

    const drawPageHeader = () => {
      let y = margin;

      doc.setTextColor(43, 27, 19);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('Invoices - Transaction Table', pageWidth / 2, y, { align: 'center' });

      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(
        `Buyer: ${selectedBuyer || 'All Buyers'}   |   Date: ${selectedDate || 'All Dates'}   |   Invoice: ${invoiceNumber || 'All Numbers'}`,
        pageWidth / 2,
        y,
        { align: 'center' }
      );

      y += 4.5;
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, pageWidth / 2, y, { align: 'center' });

      y += 4.5;
      doc.setDrawColor(221, 215, 204);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;

      return y;
    };

    const drawTableHeader = (startY) => {
      let x = margin;
      doc.setFillColor(248, 246, 243);
      doc.setDrawColor(221, 215, 204);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(123, 109, 96);

      columns.forEach((col) => {
        doc.rect(x, startY, col.width, headerHeight, 'FD');
        doc.text(col.header, x + 2, startY + 6.5);
        x += col.width;
      });

      return startY + headerHeight;
    };

    const drawCell = ({
      x,
      y,
      w,
      h,
      text,
      align = 'left',
      fill = [255, 255, 255],
      textColor = [43, 27, 19],
      bold = false
    }) => {
      doc.setFillColor(fill[0], fill[1], fill[2]);
      doc.setDrawColor(221, 215, 204);
      doc.rect(x, y, w, h, 'FD');

      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);

      const content = Array.isArray(text)
        ? text
        : doc.splitTextToSize(String(text), w - 4);

      const textY = y + 4;

      if (align === 'right') {
        doc.text(content, x + w - 2, textY, { align: 'right' });
      } else if (align === 'center') {
        doc.text(content, x + w / 2, textY, { align: 'center' });
      } else {
        doc.text(content, x + 2, textY);
      }
    };

    let y = drawPageHeader();
    y = drawTableHeader(y);

    if (filteredTransactions.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(123, 109, 96);
      doc.text('No transactions found matching your filters.', pageWidth / 2, y + 15, { align: 'center' });
      doc.save(`Invoices_${new Date().toISOString().split('T')[0]}.pdf`);
      return;
    }

    filteredTransactions.forEach((transaction) => {
      const status = transaction.status.toUpperCase();
      const statusColors = getStatusColor(transaction.status);

      const rowCells = [
        transaction.invoiceId,
        transaction.buyerName,
        formatDate(transaction.date),
        transaction.address,
        transaction.phone,
        formatCurrency(transaction.amount),
        status
      ];

      const wrappedLines = [
        doc.splitTextToSize(String(rowCells[0]), columns[0].width - 4).length,
        doc.splitTextToSize(String(rowCells[1]), columns[1].width - 4).length,
        doc.splitTextToSize(String(rowCells[2]), columns[2].width - 4).length,
        doc.splitTextToSize(String(rowCells[3]), columns[3].width - 4).length,
        doc.splitTextToSize(String(rowCells[4]), columns[4].width - 4).length,
        doc.splitTextToSize(String(rowCells[5]), columns[5].width - 4).length,
        doc.splitTextToSize(String(rowCells[6]), columns[6].width - 4).length
      ];

      const rowHeight = Math.max(...wrappedLines) * lineHeight + 4;

      if (y + rowHeight > pageHeight - margin) {
        doc.addPage();
        y = drawPageHeader();
        y = drawTableHeader(y);
      }

      let x = margin;

      drawCell({ x, y, w: columns[0].width, h: rowHeight, text: rowCells[0] });
      x += columns[0].width;

      drawCell({
        x,
        y,
        w: columns[1].width,
        h: rowHeight,
        text: rowCells[1]
      });
      x += columns[1].width;

      drawCell({ x, y, w: columns[2].width, h: rowHeight, text: rowCells[2] });
      x += columns[2].width;

      drawCell({
        x,
        y,
        w: columns[3].width,
        h: rowHeight,
        text: rowCells[3]
      });
      x += columns[3].width;

      drawCell({ x, y, w: columns[4].width, h: rowHeight, text: rowCells[4] });
      x += columns[4].width;

      drawCell({
        x,
        y,
        w: columns[5].width,
        h: rowHeight,
        text: rowCells[5],
        align: 'right',
        bold: true
      });
      x += columns[5].width;

      drawCell({
        x,
        y,
        w: columns[6].width,
        h: rowHeight,
        text: rowCells[6],
        align: 'center',
        fill: [statusColors.bg.includes('dcf') ? 220 : statusColors.bg.includes('fef') ? 254 : 252, statusColors.bg.includes('dcf') ? 252 : statusColors.bg.includes('fef') ? 243 : 231, statusColors.bg.includes('dcf') ? 231 : statusColors.bg.includes('fef') ? 199 : 243],
        textColor: [
          statusColors.color === '#166534' ? 22 : statusColors.color === '#92400e' ? 146 : 157,
          statusColors.color === '#166534' ? 101 : statusColors.color === '#92400e' ? 64 : 23,
          statusColors.color === '#166534' ? 52 : statusColors.color === '#92400e' ? 14 : 77
        ],
        bold: true
      });

      y += rowHeight;
    });

    doc.save(`Invoices_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#ffffff',
      fontFamily: "'Inter', sans-serif"
    }}>
      <Navbar />

      <div style={{
        padding: '90px 32px 40px',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        <div style={{ marginBottom: '28px', textAlign: 'center' }}>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '34px',
            fontWeight: 600,
            color: '#2C1810',
            margin: '0 0 6px 0',
            letterSpacing: '-0.7px'
          }}>
            Invoices
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#7b6d60',
            margin: 0
          }}>
            View and manage all your transaction invoices
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            color: '#991b1b',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px'
          }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '32px 16px',
            color: '#7b6d60',
            fontSize: '14px'
          }}>
            Loading invoices...
          </div>
        )}

        {!loading && (
          <>
            <div style={{
              display: 'flex',
              gap: '16px',
              marginBottom: '24px',
              flexWrap: 'wrap',
              alignItems: 'flex-end',
              justifyContent: 'center'
            }}>
              <div style={{
                width: '220px',
                minWidth: '200px'
              }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#7b6d60',
                  marginBottom: '6px',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase'
                }}>
                  Select Buyer
                </label>
                <select
                  value={selectedBuyer}
                  onChange={(e) => setSelectedBuyer(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #ddd7cc',
                    background: 'white',
                    fontSize: '14px',
                    color: '#2C1810',
                    fontFamily: "'Inter', sans-serif",
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">All Buyers</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.partyName}>
                      {customer.partyName}
                    </option>
                  ))}
                </select>
              </div>

          <div style={{
            width: '200px',
            minWidth: '180px'
          }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: '#7b6d60',
              marginBottom: '6px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}>
              Choose Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #ddd7cc',
                background: 'white',
                fontSize: '14px',
                color: '#2C1810',
                fontFamily: "'Inter', sans-serif",
                cursor: 'pointer',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
                colorScheme: 'light'
              }}
            />
          </div>

          <div style={{
            width: '200px',
            minWidth: '180px'
          }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: '#7b6d60',
              marginBottom: '6px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}>
              Invoice Number
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Search invoice number"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #ddd7cc',
                background: 'white',
                fontSize: '14px',
                color: '#2C1810',
                fontFamily: "'Inter', sans-serif",
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-end',
            paddingBottom: '2px',
            flexShrink: 0
          }}>
            <button
              onClick={exportCSV}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: '1px solid #ddd7cc',
                background: 'white',
                color: '#8B6914',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#f3f0ea';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'white';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B6914" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </button>

            <button
              onClick={downloadPDF}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                background: '#8B6914',
                color: 'white',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#7a5a10';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#8B6914';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Download PDF
            </button>
          </div>
        </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '14px',
              marginBottom: '24px'
            }}>
              <div style={{
                background: '#f8f6f3',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid #eeeae3'
              }}>
                <p style={{ fontSize: '12px', color: '#7b6d60', margin: '0 0 4px 0', fontWeight: 500 }}>Total Invoices</p>
                <h3 style={{ fontSize: '24px', color: '#2C1810', margin: 0, fontWeight: 700 }}>{filteredTransactions.length}</h3>
              </div>
              <div style={{
                background: '#f8f6f3',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid #eeeae3'
              }}>
                <p style={{ fontSize: '12px', color: '#7b6d60', margin: '0 0 4px 0', fontWeight: 500 }}>Total Amount</p>
                <h3 style={{ fontSize: '24px', color: '#8B6914', margin: 0, fontWeight: 700 }}>
                  {formatCurrency(filteredTransactions.reduce((sum, t) => sum + t.amount, 0))}
                </h3>
              </div>
              <div style={{
                background: '#f8f6f3',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid #eeeae3'
              }}>
                <p style={{ fontSize: '12px', color: '#7b6d60', margin: '0 0 4px 0', fontWeight: 500 }}>Paid</p>
                <h3 style={{ fontSize: '24px', color: '#166534', margin: 0, fontWeight: 700 }}>
                  {filteredTransactions.filter(t => t.status === 'paid').length}
                </h3>
              </div>
              <div style={{
                background: '#f8f6f3',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid #eeeae3'
              }}>
                <p style={{ fontSize: '12px', color: '#7b6d60', margin: '0 0 4px 0', fontWeight: 500 }}>Due</p>
                <h3 style={{ fontSize: '24px', color: '#92400e', margin: 0, fontWeight: 700 }}>
                  {filteredTransactions.filter(t => t.status === 'due').length}
                </h3>
              </div>
              <div style={{
                background: '#f8f6f3',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid #eeeae3'
              }}>
                <p style={{ fontSize: '12px', color: '#7b6d60', margin: '0 0 4px 0', fontWeight: 500 }}>Pending</p>
                <h3 style={{ fontSize: '24px', color: '#9d174d', margin: 0, fontWeight: 700 }}>
                  {filteredTransactions.filter(t => t.status === 'pending').length}
                </h3>
              </div>
            </div>

            <div style={{
              background: 'white',
              borderRadius: '16px',
              border: '1px solid #eeeae3',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid #eeeae3',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '20px',
                  fontWeight: 600,
                  color: '#2C1810',
                  margin: 0
                }}>
                  Transaction History
                </h3>
                <span style={{
                  fontSize: '13px',
                  color: '#7b6d60',
                  fontWeight: 500
                }}>
                  {filteredTransactions.length} record{filteredTransactions.length !== 1 ? 's' : ''}
                </span>
              </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: '800px'
            }}>
              <thead>
                <tr style={{
                  background: '#f8f6f3',
                  borderBottom: '1px solid #e5e0d8'
                }}>
                  <th style={{
                    padding: '14px 16px',
                    textAlign: 'left',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#7b6d60',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase'
                  }}>
                    Invoice ID
                  </th>
                  <th style={{
                    padding: '14px 16px',
                    textAlign: 'left',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#7b6d60',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase'
                  }}>
                    Buyer Name
                  </th>
                  <th style={{
                    padding: '14px 16px',
                    textAlign: 'left',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#7b6d60',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase'
                  }}>
                    Date
                  </th>
                  <th style={{
                    padding: '14px 16px',
                    textAlign: 'left',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#7b6d60',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase'
                  }}>
                    Address
                  </th>
                  <th style={{
                    padding: '14px 16px',
                    textAlign: 'left',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#7b6d60',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase'
                  }}>
                    Phone No.
                  </th>
                  <th style={{
                    padding: '14px 16px',
                    textAlign: 'right',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#7b6d60',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase'
                  }}>
                    Amount
                  </th>
                  <th style={{
                    padding: '14px 16px',
                    textAlign: 'center',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#7b6d60',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase'
                  }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction, index) => {
                    const statusColors = getStatusColor(transaction.status);
                    return (
                      <tr
                        key={transaction.id}
                        style={{
                          borderBottom: index < filteredTransactions.length - 1 ? '1px solid #f0ece5' : 'none',
                          transition: 'background 0.2s',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#faf8f5';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <td style={{ padding: '14px 16px' }}>
                          <button
                            onClick={() => handleInvoiceClick(transaction)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#8B6914',
                              fontSize: '14px',
                              fontWeight: 600,
                              fontFamily: "'Inter', sans-serif",
                              cursor: 'pointer',
                              padding: 0,
                              textDecoration: 'none',
                              transition: 'color 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.color = '#6b520f';
                              e.target.style.textDecoration = 'underline';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.color = '#8B6914';
                              e.target.style.textDecoration = 'none';
                            }}
                          >
                            {transaction.invoiceId}
                          </button>
                        </td>
                        <td style={{
                          padding: '14px 16px',
                          fontSize: '14px',
                          fontWeight: 500,
                          color: '#2C1810'
                        }}>
                          {transaction.buyerName}
                        </td>
                        <td style={{
                          padding: '14px 16px',
                          fontSize: '13px',
                          color: '#5C4033'
                        }}>
                          {formatDate(transaction.date)}
                        </td>
                        <td style={{
                          padding: '14px 16px',
                          fontSize: '13px',
                          color: '#5C4033'
                        }}>
                          {transaction.address}
                        </td>
                        <td style={{
                          padding: '14px 16px',
                          fontSize: '13px',
                          color: '#5C4033',
                          fontFamily: "'Inter', sans-serif"
                        }}>
                          {transaction.phone}
                        </td>
                        <td style={{
                          padding: '14px 16px',
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#2C1810',
                          textAlign: 'right'
                        }}>
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td style={{
                          padding: '14px 16px',
                          textAlign: 'center'
                        }}>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: statusColors.bg,
                            color: statusColors.color,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            {transaction.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} style={{
                      padding: '40px',
                      textAlign: 'center',
                      color: '#7b6d60',
                      fontSize: '14px'
                    }}>
                      <div style={{ marginBottom: '12px' }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ddd7cc" strokeWidth="1.5" style={{ margin: '0 auto', display: 'block' }}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                        </svg>
                      </div>
                      No transactions found matching your filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .filters-container {
            flex-wrap: wrap !important;
          }
          .filter-item {
            width: calc(50% - 8px) !important;
            min-width: 180px !important;
          }
        }

        @media (max-width: 768px) {
          .invoices-page {
            padding: 80px 16px 30px !important;
          }
          h1 {
            font-size: 28px !important;
          }
          .filters-container {
            flex-direction: column !important;
            gap: 12px !important;
          }
          .filter-item {
            width: 100% !important;
            min-width: 100% !important;
          }
          .action-buttons {
            flex-direction: column !important;
            width: 100% !important;
          }
          .action-buttons button {
            width: 100% !important;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr !important;
          }
        }

        input[type="date"]::-webkit-calendar-picker-indicator {
          cursor: pointer;
          filter: brightness(0);
          opacity: 1;
        }

        input[type="date"]::-webkit-calendar-picker-indicator:hover {
          opacity: 0.8;
        }

        select:hover,
        input[type="text"]:hover,
        input[type="date"]:hover {
          border-color: #c4bbae !important;
        }

        select:focus,
        input[type="text"]:focus,
        input[type="date"]:focus {
          border-color: #8B6914 !important;
          box-shadow: 0 0 0 3px rgba(139, 105, 20, 0.1) !important;
        }
      `}</style>
    </div>
  );
}

export default Invoices;
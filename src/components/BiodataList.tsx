import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Biodata, UserRole, OperationType } from '../types';
import { handleFirestoreError } from '../lib/utils';
import { Search, ChevronLeft, ChevronRight, Edit2, Trash2, Printer, Eye, FileText, Download, X, Image as ImageIcon, FileSpreadsheet, FileDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BiodataListProps {
  role: UserRole;
  onEdit: (item: Biodata) => void;
}

export default function BiodataList({ role, onEdit }: BiodataListProps) {
  const [data, setData] = useState<Biodata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string, title: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const path = 'biodata';
    
    if (!auth.currentUser) {
      setLoading(false);
      setError('Akses ditolak: Silakan klik ADMIN LOGIN terlebih dahulu untuk mengakses database.');
      return;
    }

    const baseQuery = role === UserRole.ADMIN 
      ? query(collection(db, path), orderBy('createdAt', 'desc'))
      : query(collection(db, path), where('userId', '==', auth.currentUser.uid), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(baseQuery, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Biodata));
      setData(records);
      setLoading(false);
      setError(null);
    }, (error) => {
      console.error('Error fetching biodata:', error);
      setError(error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [role]);

  const filteredData = useMemo(() => {
    return data.filter(item => 
      item.namaLengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.nik.includes(searchTerm) ||
      item.npwp.includes(searchTerm) ||
      item.instansi.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleDelete = (id: string) => {
    if (!id) {
      alert('Gagal: ID data tidak ditemukan.');
      return;
    }
    setDeleteConfirmId(id);
  };

  const executeDelete = async (id: string) => {
    console.log('Proceeding with deletion from Firestore...');
    setLoading(true);
    setDeleteConfirmId(null);
    try {
      const docRef = doc(db, 'biodata', id);
      await deleteDoc(docRef);
      alert('Data berhasil dihapus dari database.');
    } catch (error: any) {
      console.error('CRITICAL DELETE ERROR:', error);
      let errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.toLowerCase().includes('permission') || errorMessage.toLowerCase().includes('insufficient')) {
        errorMessage = 'Izin ditolak. Pastikan email Anda terdaftar sebagai Admin.';
      }
      alert('Gagal menghapus data: ' + errorMessage);
      handleFirestoreError(error, OperationType.DELETE, 'biodata');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (item: Biodata) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const today = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const city = 'Bandung';

    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak Biodata - ${item.namaLengkap}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
            
            @page {
              size: auto;
              margin: 0 !important;
            }

            body {
              font-family: 'Inter', sans-serif;
              margin: 0 !important;
              padding: 1cm !important;
              line-height: 1.6;
              color: #000;
              -webkit-print-color-adjust: exact;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            .header p {
              margin: 5px 0 0;
              font-size: 14px;
              color: #333;
            }
            .divider-top {
              border-top: 2px solid #000;
              margin-bottom: 30px;
            }
            .data-table {
              width: 100%;
              border-collapse: collapse;
            }
            .data-table tr {
              border-bottom: 1px solid #000;
            }
            .data-table td {
              padding: 12px 0;
              vertical-align: top;
            }
            .label {
              width: 250px;
              font-weight: bold;
              text-transform: uppercase;
              font-size: 13px;
            }
            .colon {
              width: 20px;
              text-align: center;
            }
            .value {
              font-size: 14px;
              text-transform: uppercase;
            }
            .signature-container {
              margin-top: 60px;
              display: flex;
              flex-direction: column;
              align-items: flex-end;
            }
            .signature-box {
              text-align: center;
              display: inline-block;
              min-width: 250px;
            }
            .signature-box p {
              margin: 0;
              font-size: 14px;
            }
            .signature-space {
              height: 100px;
            }
            .signature-name {
              font-weight: 700;
              text-decoration: underline;
              text-transform: uppercase;
              display: inline-block;
              font-size: 14px;
            }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>BIODATA</h1>
            <p>Informasi Data Pribadi</p>
          </div>
          
          <div class="divider-top"></div>

          <table class="data-table">
            <tr>
              <td class="label">NAMA LENGKAP</td>
              <td class="colon">:</td>
              <td class="value">${item.namaLengkap}</td>
            </tr>
            <tr>
              <td class="label">NIP</td>
              <td class="colon">:</td>
              <td class="value">${item.nip || '-'}</td>
            </tr>
            <tr>
              <td class="label">PANGKAT / GOLONGAN</td>
              <td class="colon">:</td>
              <td class="value">${item.pangkatGolongan || '-'}</td>
            </tr>
            <tr>
              <td class="label">JABATAN</td>
              <td class="colon">:</td>
              <td class="value">${item.jabatan}</td>
            </tr>
            <tr>
              <td class="label">NIK</td>
              <td class="colon">:</td>
              <td class="value">${item.nik}</td>
            </tr>
            <tr>
              <td class="label">NPWP</td>
              <td class="colon">:</td>
              <td class="value">${item.npwp}</td>
            </tr>
            <tr>
              <td class="label">INSTANSI</td>
              <td class="colon">:</td>
              <td class="value">${item.instansi}</td>
            </tr>
            <tr>
              <td class="label">ALAMAT</td>
              <td class="colon">:</td>
              <td class="value">${item.alamatKantor}</td>
            </tr>
            <tr>
              <td class="label">PENDIDIKAN</td>
              <td class="colon">:</td>
              <td class="value">${item.pendidikan}</td>
            </tr>
            <tr>
              <td class="label">NO. TELP / WA</td>
              <td class="colon">:</td>
              <td class="value">${item.telpWa}</td>
            </tr>
            <tr>
              <td class="label">BANK - REKENING</td>
              <td class="colon">:</td>
              <td class="value">${item.namaBank} - ${item.nomorRekening}</td>
            </tr>
          </table>

          <div class="signature-container">
            <div class="signature-box">
              <p>${city}, ${today}</p>
              <p>Yang Menyatakan,</p>
              <div class="signature-space"></div>
              <p class="signature-name">${item.namaLengkap}</p>
            </div>
          </div>

          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const exportExcel = () => {
    const headers = [
      "Nama Lengkap", 
      "NIK", 
      "NPWP", 
      "NIP", 
      "Pangkat/Golongan", 
      "Jabatan", 
      "Instansi", 
      "Alamat Kantor", 
      "Pendidikan", 
      "No. Telp/WA", 
      "Bank", 
      "Nomor Rekening"
    ];

    const rows = filteredData.map(item => [
      item.namaLengkap,
      item.nik,
      item.npwp,
      item.nip || '-',
      item.pangkatGolongan || '-',
      item.jabatan,
      item.instansi,
      item.alamatKantor,
      item.pendidikan,
      item.telpWa,
      item.namaBank,
      item.nomorRekening
    ]);

    // Create worksheet
    const worksheetData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Auto-adjust column widths
    const colWidths = headers.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...rows.map(r => r[i]?.toString().length || 0)
      );
      return { wch: maxLen + 5 }; // Add padding
    });
    ws['!cols'] = colWidths;

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Biodata");

    // Download
    XLSX.writeFile(wb, `Data_Biodata_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape A4
    
    const headers = [
      "Nama", 
      "NIK", 
      "NPWP", 
      "NIP", 
      "Pangkat/Gol", 
      "Jabatan", 
      "Instansi", 
      "Alamat", 
      "Pendidikan", 
      "Kontak", 
      "Bank", 
      "Rekening"
    ];

    const rows = filteredData.map(item => [
      item.namaLengkap,
      item.nik,
      item.npwp,
      item.nip || '-',
      item.pangkatGolongan || '-',
      item.jabatan,
      item.instansi,
      item.alamatKantor,
      item.pendidikan,
      item.telpWa,
      item.namaBank,
      item.nomorRekening
    ]);

    // Add title
    doc.setFontSize(16);
    doc.text("DATA BIODATA REKAPITULASI", 14, 15);
    doc.setFontSize(10);
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 22);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 28,
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 2,
        valign: 'middle',
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [59, 130, 246], // Blue-500
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 30 }, // Nama
        1: { cellWidth: 25 }, // NIK
        2: { cellWidth: 25 }, // NPWP
        3: { cellWidth: 22 }, // NIP
        6: { cellWidth: 25 }, // Instansi
        7: { cellWidth: 35 }, // Alamat
      },
      margin: { top: 30 }
    });

    doc.save(`Data_Biodata_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Database Biodata</h2>
            <p className="text-gray-500 text-sm">Total {filteredData.length} data ditemukan</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={exportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all border border-emerald-100/50"
            >
              <FileSpreadsheet size={16} />
              EXCEL
            </button>
            <button
              onClick={exportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all border border-rose-100/50"
            >
              <FileDown size={16} />
              PDF
            </button>
            <div className="relative group w-full md:w-64">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="Cari data..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-11 py-2.5 bg-slate-100/80 border border-transparent rounded-full focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm font-medium placeholder:text-gray-400"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-gray-600/80 hover:bg-gray-700 text-white rounded-full transition-all"
                  title="Bersihkan pencarian"
                >
                  <X size={14} strokeWidth={3} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                <th className="px-6 py-4">Nama</th>
                <th className="px-6 py-4">NIK / NPWP</th>
                <th className="px-6 py-4">Instansi / Jabatan</th>
                <th className="px-6 py-4">Kontak</th>
                <th className="px-6 py-4">Tgl Input</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-gray-400 italic">Memuat data...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl max-w-md mx-auto">
                      <p className="text-sm text-red-600 font-bold mb-1">Gagal Memuat Database</p>
                      <p className="text-[10px] text-red-500 font-mono break-all">{error}</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">Tidak ada data ditemukan</td>
                </tr>
              ) : (
                paginatedData.map((item) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={item.id} 
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 text-sm uppercase">{item.namaLengkap}</p>
                      <p className="text-xs text-gray-400 font-mono tracking-tight">{item.nip || 'TANPA NIP'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-blue-50 px-2 py-0.5 rounded w-fit">
                          <Eye size={10} /> {item.nik}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-orange-50 px-2 py-0.5 rounded w-fit">
                          <FileText size={10} /> {item.npwp}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-700 font-medium">{item.instansi}</p>
                      <p className="text-xs text-gray-500">{item.jabatan}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                      {item.telpWa}
                    </td>
                    <td className="px-6 py-4 text-[10px] text-gray-400 font-mono uppercase">
                      {item.createdAt?.toDate().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {item.fotoKtpUrl && (
                          <button 
                            onClick={() => setPreviewPhoto({ url: item.fotoKtpUrl!, title: `KTP - ${item.namaLengkap}` })}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                            title="Lihat KTP"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                        {item.fotoNpwpUrl && (
                          <button 
                            onClick={() => setPreviewPhoto({ url: item.fotoNpwpUrl!, title: `NPWP - ${item.namaLengkap}` })}
                            className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors border border-transparent hover:border-orange-100"
                            title="Lihat NPWP"
                          >
                            <FileText size={16} />
                          </button>
                        )}
                        <button 
                          onClick={() => handlePrint(item)}
                          className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-100"
                          title="Cetak"
                        >
                          <Printer size={16} />
                        </button>
                        <button 
                          onClick={() => onEdit(item)}
                          className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors border border-transparent hover:border-yellow-100"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        {role === UserRole.ADMIN && (
                          <button 
                            onClick={() => {
                              console.log('Delete button clicked for item:', item.id);
                              handleDelete(item.id!);
                            }}
                            className="p-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 flex items-center justify-center"
                            title="Hapus"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <p className="text-xs text-gray-500">
              Menampilkan <span className="font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> sampai <span className="font-bold">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> dari <span className="font-bold">{filteredData.length}</span> data
            </p>
            <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Baris:</span>
              <select 
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-600 outline-none focus:border-blue-500 transition-all cursor-pointer"
              >
                {[5, 10, 25, 50, 100].map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                    currentPage === i + 1 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white border border-gray-200 text-gray-500 hover:border-blue-500'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Photo Preview Modal */}
      <AnimatePresence>
        {previewPhoto && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl overflow-hidden max-w-3xl w-full flex flex-col"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                    <ImageIcon size={18} />
                  </div>
                  <h3 className="font-bold text-gray-900">{previewPhoto.title}</h3>
                </div>
                <button 
                  onClick={() => setPreviewPhoto(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="p-2 bg-gray-900 flex-1 flex items-center justify-center min-h-[400px]">
                <img src={previewPhoto.url} alt="Document Preview" className="max-w-full max-h-[70vh] object-contain shadow-2xl" />
              </div>
              <div className="p-4 bg-gray-50 flex justify-end">
                <button 
                  onClick={() => setPreviewPhoto(null)}
                  className="px-6 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors"
                >
                  Tutup Preview
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-sm w-full"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Konfirmasi Hapus</h3>
                <p className="text-gray-500 text-sm mb-6">
                  Apakah Anda yakin ingin menghapus data ini secara permanen dari database?
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      if (deleteConfirmId) {
                        executeDelete(deleteConfirmId);
                      }
                    }}
                    disabled={loading}
                    className="w-full py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'MENGHAPUS...' : 'YA, HAPUS PERMANEN'}
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    disabled={loading}
                    className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    BATALKAN
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

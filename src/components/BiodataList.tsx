import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Biodata, UserRole, OperationType } from '../types';
import { handleFirestoreError } from '../lib/utils';
import { Search, ChevronLeft, ChevronRight, Edit2, Trash2, Printer, Eye, FileText, Download, X, Image as ImageIcon, FileSpreadsheet, FileDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast, { Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BiodataListProps {
  role: UserRole;
  onEdit: (item: Biodata) => void;
}

const ModalPortal = ({ children }: { children: React.ReactNode }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};

export default function BiodataList({ role, onEdit }: BiodataListProps) {
  const [data, setData] = useState<Biodata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string, title: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [printOptionsItem, setPrintOptionsItem] = useState<Biodata | null>(null);
  const [printLocation, setPrintLocation] = useState('Bandung');
  const [printDate, setPrintDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const path = 'biodata';
    const baseQuery = query(collection(db, path), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(baseQuery, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Biodata));
      setData(records);
      setLoading(false);
      setError(null);
    }, (error) => {
      console.error('Error fetching biodata:', error);
      setError('Koneksi Gagal: ' + error.message);
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
      toast.error('Gagal: ID data tidak ditemukan.');
      return;
    }
    setDeleteConfirmId(id);
  };

  const executeDelete = async (id: string) => {
    const toastId = toast.loading('Sedang menghapus data...');
    setLoading(true);
    setDeleteConfirmId(null);
    try {
      const docRef = doc(db, 'biodata', id);
      await deleteDoc(docRef);
      toast.success('Data berhasil dihapus selamanya.', { id: toastId });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, 'biodata');
      toast.error('Gagal menghapus data: ' + error.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (item: Biodata) => {
    setPrintOptionsItem(item);
  };

  const generateFinalPDF = (item: Biodata) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text("BIODATA", 105, 15, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text("Informasi Data Pribadi", 105, 22, { align: 'center' });
    
    // Horizontal Line
    doc.setLineWidth(0.5);
    doc.line(20, 28, 190, 28);
    
    // Content Data
    const dataRows = [
      ['NAMA LENGKAP', ':', item.namaLengkap],
      ['NIP', ':', item.nip || '-'],
      ['PANGKAT / GOLONGAN', ':', item.pangkatGolongan || '-'],
      ['JABATAN', ':', item.jabatan],
      ['NIK', ':', item.nik],
      ['NPWP', ':', item.npwp.replace(/[\.\-]/g, '')],
      ['INSTANSI', ':', item.instansi],
      ['ALAMAT', ':', item.alamatKantor],
      ['PENDIDIKAN', ':', item.pendidikan],
      ['NO. TELP / WA', ':', item.telpWa],
      ['BANK - REKENING', ':', `${item.namaBank} - ${item.nomorRekening}`],
    ];

    autoTable(doc, {
      body: dataRows,
      startY: 35,
      margin: { left: 20, right: 20 },
      theme: 'plain',
      styles: {
        fontSize: 12,
        cellPadding: { top: 5, bottom: 5, left: 2, right: 2 },
        textColor: [0, 0, 0], // Solid black
        font: 'helvetica'
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 55 },
        1: { cellWidth: 5, halign: 'center' },
        2: { cellWidth: 110 }
      },
      didDrawCell: (data) => {
        // Draw bottom line for each row across the full width of the table
        if (data.row.index < dataRows.length) {
          const doc = data.doc;
          doc.setDrawColor(0, 0, 0); // Solid black line
          doc.setLineWidth(0.1);
          // Only draw if it's the last cell in the row
          if (data.column.index === 2) {
            const tableWidth = 170; // 55 + 5 + 110
            const startX = 20;
            doc.line(startX, data.cell.y + data.cell.height, startX + tableWidth, data.cell.y + data.cell.height);
          }
        }
      }
    });

    // Signature Area
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    
    // Format the custom date
    const dateObj = new Date(printDate);
    const dateStr = `${printLocation}, ${dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    
    doc.setFontSize(12);
    doc.text(dateStr, 150, finalY, { align: 'center' });
    doc.text("Yang Menyatakan,", 150, finalY + 7, { align: 'center' });
    
    doc.setFont('helvetica', 'bold');
    doc.text(item.namaLengkap, 150, finalY + 35, { align: 'center' });
    doc.setLineWidth(0.3);
    const textWidth = doc.getTextWidth(item.namaLengkap);
    doc.line(150 - (textWidth/2), finalY + 36, 150 + (textWidth/2), finalY + 36);

    // Open in new tab
    try {
      const pdfUrl = doc.output('bloburl');
      window.open(pdfUrl, '_blank');
      toast.success('PDF berhasil digenerate.');
    } catch (err) {
      toast.error('Gagal membuka PDF.');
    }
    setPrintOptionsItem(null); // Close modal
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
      <Toaster position="top-right" reverseOrder={false} />
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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={item.id} 
                    className="hover:bg-gray-50 transition-colors relative z-0"
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
                    <td className="px-6 py-4 relative">
                      <div className="flex items-center justify-center gap-2 relative z-10">
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
          <ModalPortal>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[5000] grid place-items-center p-4 bg-black/90 backdrop-blur-md no-print w-full h-full left-0 top-0"
              onClick={() => setPreviewPhoto(null)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col relative shadow-2xl"
                onClick={(e) => e.stopPropagation()}
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
          </ModalPortal>
        )}
      </AnimatePresence>

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <ModalPortal>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[5010] grid place-items-center p-4 bg-black/60 backdrop-blur-sm no-print font-sans w-full h-full left-0 top-0"
              onClick={() => setDeleteConfirmId(null)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-sm w-full relative"
                onClick={(e) => e.stopPropagation()}
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
                      className="w-full py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50 shadow-lg shadow-red-200"
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
          </ModalPortal>
        )}
      </AnimatePresence>

      {/* Print Options Modal */}
      <AnimatePresence>
        {printOptionsItem && (
          <ModalPortal>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[5020] grid place-items-center p-4 bg-black/60 backdrop-blur-sm no-print w-full h-full left-0 top-0 overflow-y-auto"
              onClick={() => setPrintOptionsItem(null)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 30 }}
                className="bg-white rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden max-w-md w-full relative"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-8 md:p-10">
                  <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-8 rotate-3 shadow-inner">
                    <Printer size={36} strokeWidth={1.5} className="-rotate-3" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2 text-center tracking-tight">Cetak Biodata</h3>
                  <p className="text-gray-500 text-sm mb-10 text-center leading-relaxed font-medium">
                    Sesuaikan tempat dan tanggal untuk tanda tangan di berkas PDF yang akan digenerate.
                  </p>
                  
                  <div className="space-y-6 mb-10">
                    <div className="group">
                      <label className="block text-[11px] font-black text-gray-400 uppercase mb-2.5 ml-1 tracking-widest transition-colors group-focus-within:text-blue-500">Tempat / Kota</label>
                      <input 
                        type="text"
                        value={printLocation}
                        onChange={(e) => setPrintLocation(e.target.value)}
                        className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-blue-500 transition-all placeholder:text-gray-300"
                        placeholder="Contoh: Bandung"
                      />
                    </div>
                    <div className="group">
                      <label className="block text-[11px] font-black text-gray-400 uppercase mb-2.5 ml-1 tracking-widest transition-colors group-focus-within:text-blue-500">Tanggal Cetak</label>
                      <input 
                        type="date"
                        value={printDate}
                        onChange={(e) => setPrintDate(e.target.value)}
                        className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-blue-500 transition-all cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <button
                      onClick={() => generateFinalPDF(printOptionsItem)}
                      className="w-full py-4.5 bg-blue-600 text-white rounded-2xl text-base font-black hover:bg-blue-700 transition-all shadow-[0_20px_40px_-12px_rgba(37,99,235,0.3)] active:scale-[0.98] uppercase tracking-wide"
                    >
                      CETAK PDF
                    </button>
                    <button
                      onClick={() => setPrintOptionsItem(null)}
                      className="w-full py-4 text-gray-400 rounded-2xl text-sm font-bold hover:bg-gray-50 hover:text-gray-600 transition-colors uppercase tracking-widest"
                    >
                      BATAL
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </ModalPortal>
        )}
      </AnimatePresence>

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Biodata, OperationType } from '../types';
import { handleFirestoreError, GOLONGAN_OPTIONS } from '../lib/utils';
import { Save, User, CreditCard, Landmark, Phone, Book, Building, MapPin, Upload, X, Camera, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';
import ModernSelect from './ModernSelect';

interface BiodataFormProps {
  editingBiodata?: Biodata | null;
  onCancelEdit?: () => void;
  onSuccess?: () => void;
}

export default function BiodataForm({ editingBiodata, onCancelEdit, onSuccess }: BiodataFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<Partial<Biodata>>({
    namaLengkap: '',
    nip: '',
    pangkatGolongan: '',
    jabatan: '',
    nik: '',
    npwp: '',
    instansi: '',
    alamatKantor: '',
    pendidikan: '',
    telpWa: '',
    namaBank: '',
    nomorRekening: '',
    fotoKtpUrl: '',
    fotoNpwpUrl: '',
  });

  useEffect(() => {
    if (editingBiodata) {
      setFormData({
        namaLengkap: editingBiodata.namaLengkap || '',
        nip: editingBiodata.nip || '',
        pangkatGolongan: editingBiodata.pangkatGolongan || '',
        jabatan: editingBiodata.jabatan || '',
        nik: editingBiodata.nik || '',
        npwp: editingBiodata.npwp || '',
        instansi: editingBiodata.instansi || '',
        alamatKantor: editingBiodata.alamatKantor || '',
        pendidikan: editingBiodata.pendidikan || '',
        telpWa: editingBiodata.telpWa || '',
        namaBank: editingBiodata.namaBank || '',
        nomorRekening: editingBiodata.nomorRekening || '',
        fotoKtpUrl: editingBiodata.fotoKtpUrl || '',
        fotoNpwpUrl: editingBiodata.fotoNpwpUrl || '',
      });
    } else {
      setFormData({
        namaLengkap: '',
        nip: '',
        pangkatGolongan: '',
        jabatan: '',
        nik: '',
        npwp: '',
        instansi: '',
        alamatKantor: '',
        pendidikan: '',
        telpWa: '',
        namaBank: '',
        nomorRekening: '',
        fotoKtpUrl: '',
        fotoNpwpUrl: '',
      });
    }
  }, [editingBiodata]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for documents
    if (!formData.fotoKtpUrl || !formData.fotoNpwpUrl) {
      alert('Mohon lengkapi Dokumen Pendukung (Foto KTP & NPWP)!');
      return;
    }

    setLoading(true);
    try {
      const path = 'biodata';
      const currentUser = auth.currentUser;

      if (editingBiodata?.id) {
        await updateDoc(doc(db, path, editingBiodata.id), {
          ...formData,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, path), {
          ...formData,
          userId: currentUser ? currentUser.uid : 'simulation-guest-id',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setSuccess(true);
      if (!editingBiodata) {
        setFormData({
          namaLengkap: '',
          nip: '',
          pangkatGolongan: '',
          jabatan: '',
          nik: '',
          npwp: '',
          instansi: '',
          alamatKantor: '',
          pendidikan: '',
          telpWa: '',
          namaBank: '',
          nomorRekening: '',
          fotoKtpUrl: '',
          fotoNpwpUrl: '',
        });
      }
      setTimeout(() => {
        setSuccess(false);
        if (editingBiodata && onCancelEdit) {
          onCancelEdit();
        }
        if (onSuccess) {
          onSuccess();
        }
      }, 1000);
    } catch (error: any) {
      console.error('Save Biodata Error:', error);
      alert('Gagal menyimpan data ke database. Error: ' + (error.message || error));
      try {
        handleFirestoreError(error, editingBiodata ? OperationType.UPDATE : OperationType.CREATE, 'biodata');
      } catch (e) {
        // Log is enough
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'fotoKtpUrl' | 'fotoNpwpUrl') => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (over 2MB before compression we might want to warn)
      if (file.size > 5 * 1024 * 1024) {
        alert('File terlalu besar! Maksimal 5MB sebelum kompresi.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Compress using canvas
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Limit max dimensions to 800px to keep base64 string small
          const MAX_DIM = 800;
          if (width > height) {
            if (width > MAX_DIM) {
              height *= MAX_DIM / width;
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width *= MAX_DIM / height;
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Quality 0.6 to keep size around 50-100KB per image
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
          setFormData(prev => ({ ...prev, [field]: compressedDataUrl }));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const maskNPWP = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '');
    let masked = '';
    if (numbers.length > 0) masked += numbers.substring(0, 2);
    if (numbers.length > 2) masked += '.' + numbers.substring(2, 5);
    if (numbers.length > 5) masked += '.' + numbers.substring(5, 8);
    if (numbers.length > 8) masked += '.' + numbers.substring(8, 9);
    if (numbers.length > 9) masked += '-' + numbers.substring(9, 12);
    if (numbers.length > 12) masked += '.' + numbers.substring(12, 15);
    return masked;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Numeric only fields
    if (['nip', 'nik', 'telpWa', 'nomorRekening'].includes(name)) {
      const numericValue = value.replace(/[^0-9]/g, '');
      setFormData({ ...formData, [name]: numericValue });
      return;
    }

    // NPWP Masking
    if (name === 'npwp') {
      setFormData({ ...formData, [name]: maskNPWP(value) });
      return;
    }

    setFormData({ ...formData, [name]: value });
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
      >
        <div className={`p-6 text-white text-center transition-colors ${editingBiodata ? 'bg-yellow-600' : 'bg-blue-600'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="w-10" />
            <h2 className="text-2xl font-bold">{editingBiodata ? 'Update Biodata' : 'Input Biodata'}</h2>
            {editingBiodata && (
              <button 
                type="button"
                onClick={onCancelEdit}
                className="p-2 hover:bg-black/10 rounded-full transition-colors"
                title="Batal Edit"
              >
                <X size={20} />
              </button>
            )}
            {!editingBiodata && <div className="w-10" />}
          </div>
          <p className="text-white/80 text-sm">{editingBiodata ? 'Perbarui data yang sudah tersimpan di database.' : 'Lengkapi data pribadi dan pekerjaan Anda dengan benar.'}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Section: Identitas Utama */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="namaLengkap"
                  required
                  value={formData.namaLengkap}
                  onChange={handleChange}
                  placeholder="Contoh: Budi Santoso, S.T."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">NIP</label>
              <input
                type="text"
                name="nip"
                inputMode="numeric"
                value={formData.nip}
                onChange={handleChange}
                placeholder="NIP (jika ada)"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ModernSelect 
              label="Pangkat / Golongan"
              options={GOLONGAN_OPTIONS}
              value={formData.pangkatGolongan || ''}
              onChange={(val) => setFormData({ ...formData, pangkatGolongan: val })}
              placeholder="-- Pilih Golongan --"
            />
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Jabatan</label>
              <input
                type="text"
                name="jabatan"
                value={formData.jabatan}
                onChange={handleChange}
                placeholder="Kepala Bagian / Staf"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Section: Dokumen Legal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">NIK <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="nik"
                required
                maxLength={16}
                inputMode="numeric"
                value={formData.nik}
                onChange={handleChange}
                placeholder="16 Digit NIK"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">NPWP <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="npwp"
                required
                maxLength={20}
                inputMode="numeric"
                value={formData.npwp}
                onChange={handleChange}
                placeholder="00.000.000.0-000.000"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Section: Instansi & Alamat */}
          <div className="space-y-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Instansi / Perusahaan <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="instansi"
                required
                value={formData.instansi}
                onChange={handleChange}
                placeholder="Nama Instansi/Perusahaan Resmi"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Alamat Lengkap Kantor <span className="text-red-500">*</span></label>
              <textarea
                name="alamatKantor"
                required
                rows={3}
                value={formData.alamatKantor}
                onChange={handleChange}
                placeholder="Jl. Contoh No. 123..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
              />
            </div>
          </div>

          {/* Section: Lain-lain */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Pendidikan <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="pendidikan"
                required
                value={formData.pendidikan}
                onChange={handleChange}
                placeholder="Contoh: S1 / S2"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">No. Telp / WA <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="telpWa"
                required
                inputMode="numeric"
                value={formData.telpWa}
                onChange={handleChange}
                placeholder="Contoh: 08123456789"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Section: Perbankan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Nama Bank <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="namaBank"
                required
                value={formData.namaBank}
                onChange={handleChange}
                placeholder="BCA / Mandiri"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Nomor Rekening <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="nomorRekening"
                required
                inputMode="numeric"
                value={formData.nomorRekening}
                onChange={handleChange}
                placeholder="Digit angka rekening"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Section: Upload (Integrated) */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-2">
              Dokumen Pendukung (Foto) <span className="text-red-500">*</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Foto KTP */}
              <div className="space-y-3">
                <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <CreditCard size={16} className="text-blue-500" />
                  FOTO KTP <span className="text-red-500">*</span>
                </p>
                <div className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-4 transition-all min-h-[220px] ${
                  formData.fotoKtpUrl ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50'
                }`}>
                  {formData.fotoKtpUrl ? (
                    <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden shadow-sm group">
                      <img src={formData.fotoKtpUrl} alt="Preview KTP" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, fotoKtpUrl: '' }))}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4 w-full">
                      <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                        <CreditCard size={32} />
                      </div>
                      <div className="flex flex-col gap-2 w-full px-2">
                        <label className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer hover:bg-blue-700 transition-all shadow-md active:scale-[0.98]">
                          <Camera size={16} />
                          Ambil Foto
                          <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment"
                            className="hidden" 
                            onChange={(e) => handleFileChange(e, 'fotoKtpUrl')}
                          />
                        </label>
                        <label className="flex items-center justify-center gap-2 px-4 py-3 bg-white text-blue-600 border border-blue-200 rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer hover:bg-blue-50 transition-all active:scale-[0.98]">
                          <ImageIcon size={16} />
                          Pilih Galeri
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => handleFileChange(e, 'fotoKtpUrl')}
                          />
                        </label>
                      </div>
                      <p className="text-[10px] text-gray-400">Format: JPG, PNG (Max 5MB)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Foto NPWP */}
              <div className="space-y-3">
                <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Book size={16} className="text-orange-500" />
                  FOTO NPWP <span className="text-red-500">*</span>
                </p>
                <div className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-4 transition-all min-h-[220px] ${
                  formData.fotoNpwpUrl ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-gray-50'
                }`}>
                  {formData.fotoNpwpUrl ? (
                    <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden shadow-sm group">
                      <img src={formData.fotoNpwpUrl} alt="Preview NPWP" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, fotoNpwpUrl: '' }))}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4 w-full">
                      <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                        <Book size={32} />
                      </div>
                      <div className="flex flex-col gap-2 w-full px-2">
                        <label className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer hover:bg-orange-700 transition-all shadow-md active:scale-[0.98]">
                          <Camera size={16} />
                          Ambil Foto
                          <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment"
                            className="hidden" 
                            onChange={(e) => handleFileChange(e, 'fotoNpwpUrl')}
                          />
                        </label>
                        <label className="flex items-center justify-center gap-2 px-4 py-3 bg-white text-orange-600 border border-orange-200 rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer hover:bg-orange-50 transition-all active:scale-[0.98]">
                          <ImageIcon size={16} />
                          Pilih Galeri
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => handleFileChange(e, 'fotoNpwpUrl')}
                          />
                        </label>
                      </div>
                      <p className="text-[10px] text-gray-400">Format: JPG, PNG (Max 5MB)</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            {editingBiodata && (
              <button 
                type="button"
                onClick={onCancelEdit}
                className="flex-1 py-4 rounded-xl font-bold bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all uppercase tracking-widest"
              >
                Batal
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                success 
                ? 'bg-green-500 text-white shadow-lg shadow-green-200' 
                : editingBiodata 
                  ? 'bg-yellow-600 text-white hover:bg-yellow-700 shadow-lg shadow-yellow-200'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-[0.98]'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : success ? (
                editingBiodata ? 'DATA BERHASIL DIPERBARUI' : 'DATA BERHASIL DISIMPAN'
              ) : (
                <>
                  <Save size={20} />
                  {editingBiodata ? 'SIMPAN PERUBAHAN' : 'SIMPAN BIODATA'}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

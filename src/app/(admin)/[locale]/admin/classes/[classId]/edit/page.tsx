'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  IoArrowBack,
  IoCheckmark,
  IoClose,
  IoAlertCircle,
  IoImage,
  IoCloudUpload
} from 'react-icons/io5';
import {
  MdTitle,
  MdDescription,
  MdCategory,
  MdAttachMoney
} from 'react-icons/md';

type ClassCategory = 'COOKING' | 'ARTS_CRAFTS';
type ClassSubCategory =
  | 'APPETIZERS_SNACKS'
  | 'MAIN_DISHES'
  | 'DESSERTS_BAKING'
  | 'MOM_AND_KID'
  | 'PAINTING'
  | 'CRAFTS'
  | 'POTTERY';
type ClassStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';

interface Trainer {
  id: string;
  fullName: string;
  email?: string;
  profileImage?: string;
}

interface FormData {
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  category: ClassCategory | '';
  subCategory: ClassSubCategory | '';
  image: string;
  imageFile: File | null;
  images: string[];
  imageFiles: File[];
  newImageUrls: string[];
  trainerId: string;
  price: string;
  currency: string;
  seatsTotal: string;
  durationMinutes: string;
  status: ClassStatus;
  metaTitle: string;
  metaDescription: string;
}

interface FormErrors {
  [key: string]: string;
}

interface Notification {
  show: boolean;
  type: 'success' | 'error';
  message: string;
}

export default function EditClassPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const classId = params.classId as string;

  const isRTL = locale === 'ar';

  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notification, setNotification] = useState<Notification>({
    show: false,
    type: 'success',
    message: ''
  });

  const [formData, setFormData] = useState<FormData>({
    title: '',
    titleAr: '',
    description: '',
    descriptionAr: '',
    category: '',
    subCategory: '',
    image: '',
    imageFile: null,
    images: [],
    imageFiles: [],
    newImageUrls: [],
    trainerId: '',
    price: '',
    currency: 'AED',
    seatsTotal: '',
    durationMinutes: '',
    status: 'DRAFT',
    metaTitle: '',
    metaDescription: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const inputBase =
    'mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-400 dark:focus:ring-zinc-400';
  const textareaBase =
    'mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-400 dark:focus:ring-zinc-400 resize-none';
  const selectBase =
    'mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-400 dark:focus:ring-zinc-400';
  const sectionCard =
    'rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900';

  useEffect(() => {
    Promise.all([fetchClass(), fetchTrainers()]);
  }, [classId]);

  const fetchClass = async () => {
    try {
      const res = await fetch(`/api/admin/classes/${classId}`);
      if (!res.ok) throw new Error('Failed to fetch class');
      const data = await res.json();
      
      setFormData({
        title: data.title || '',
        titleAr: data.titleAr || '',
        description: data.description || '',
        descriptionAr: data.descriptionAr || '',
        category: data.category || '',
        subCategory: data.subCategory || '',
        image: data.image || '',
        imageFile: null,
        images: data.images || [],
        imageFiles: [],
        newImageUrls: [],
        trainerId: data.trainerId || '',
        price: data.price?.toString() || '',
        currency: data.currency || 'AED',
        seatsTotal: data.seatsTotal?.toString() || '',
        durationMinutes: data.durationMinutes?.toString() || '',
        status: data.status || 'DRAFT',
        metaTitle: data.metaTitle || '',
        metaDescription: data.metaDescription || ''
      });
    } catch (error) {
      console.error('Error fetching class:', error);
      showNotification('error', 'Failed to load class data');
    }
  };

  const fetchTrainers = async () => {
    try {
      const res = await fetch('/api/admin/users?role=TRAINER&status=ACTIVE&limit=100');
      if (!res.ok) throw new Error('Failed to fetch trainers');
      const data = await res.json();
      setTrainers(Array.isArray(data) ? data : data.users || []);
    } catch (error) {
      console.error('Error fetching trainers:', error);
      showNotification('error', 'Failed to load trainers');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification({ show: false, type: 'success', message: '' }), 5000);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleMainImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showNotification('error', 'Image must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        showNotification('error', 'Please select a valid image file');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          image: reader.result as string,
          imageFile: file
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGalleryImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        showNotification('error', `${file.name} is larger than 5MB`);
        return false;
      }
      if (!file.type.startsWith('image/')) {
        showNotification('error', `${file.name} is not a valid image`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    const newImagePreviews: string[] = [];
    const readPromises = validFiles.map(file => {
      return new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newImagePreviews.push(reader.result as string);
          resolve();
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readPromises).then(() => {
      setFormData((prev) => ({
        ...prev,
        newImageUrls: [...prev.newImageUrls, ...newImagePreviews],
        imageFiles: [...prev.imageFiles, ...validFiles]
      }));
    });
  };

  const removeGalleryImage = (index: number, isExisting: boolean) => {
    if (isExisting) {
      setFormData((prev) => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index)
      }));
    } else {
      const newIndex = index - formData.images.length;
      setFormData((prev) => ({
        ...prev,
        newImageUrls: prev.newImageUrls.filter((_, i) => i !== newIndex),
        imageFiles: prev.imageFiles.filter((_, i) => i !== newIndex)
      }));
    }
  };

  const removeMainImage = () => {
    setFormData((prev) => ({
      ...prev,
      image: '',
      imageFile: null
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) newErrors.title = 'English title is required';
    if (!formData.titleAr.trim()) newErrors.titleAr = 'Arabic title is required';
    if (!formData.description.trim()) newErrors.description = 'English description is required';
    if (!formData.descriptionAr.trim()) newErrors.descriptionAr = 'Arabic description is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.subCategory) newErrors.subCategory = 'Sub-category is required';
    if (!formData.image) newErrors.image = 'Main image is required';
    if (!formData.trainerId) newErrors.trainerId = 'Trainer is required';
    if (!formData.price) newErrors.price = 'Price is required';
    else if (parseFloat(formData.price) < 0) newErrors.price = 'Price must be positive';
    if (!formData.seatsTotal) newErrors.seatsTotal = 'Total seats is required';
    else if (parseInt(formData.seatsTotal) < 1) newErrors.seatsTotal = 'Must have at least 1 seat';
    if (!formData.durationMinutes) newErrors.durationMinutes = 'Duration is required';
    else if (parseInt(formData.durationMinutes) < 1) newErrors.durationMinutes = 'Duration must be positive';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'classes');

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      throw new Error('Failed to upload image');
    }

    const data = await res.json();
    return data.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showNotification('error', 'Please fix all validation errors');
      return;
    }

    setSaving(true);
    setUploading(true);

    try {
      let mainImageUrl = formData.image;
      const allGalleryImages = [...formData.images];

      // Upload new main image if changed
      if (formData.imageFile) {
        mainImageUrl = await uploadImage(formData.imageFile);
      }

      // Upload new gallery images if any
      if (formData.imageFiles.length > 0) {
        for (const file of formData.imageFiles) {
          const url = await uploadImage(file);
          allGalleryImages.push(url);
        }
      }

      setUploading(false);

      const payload = {
        title: formData.title,
        titleAr: formData.titleAr,
        description: formData.description,
        descriptionAr: formData.descriptionAr,
        category: formData.category,
        subCategory: formData.subCategory,
        image: mainImageUrl,
        images: allGalleryImages,
        trainerId: formData.trainerId,
        price: parseFloat(formData.price),
        currency: formData.currency,
        seatsTotal: parseInt(formData.seatsTotal),
        durationMinutes: parseInt(formData.durationMinutes),
        status: formData.status,
        metaTitle: formData.metaTitle || formData.title,
        metaDescription: formData.metaDescription || formData.description
      };

      const res = await fetch(`/api/admin/classes/${classId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update class');
      }

      showNotification('success', 'Class updated successfully!');
      setTimeout(() => {
        router.push(`/${locale}/admin/classes`);
      }, 1500);
    } catch (error: unknown) {
      console.error('Error updating class:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update class';
      showNotification('error', errorMessage);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const allGalleryImages = [...formData.images, ...formData.newImageUrls];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Notification */}
      {notification.show && (
        <div
          className={`fixed top-6 ${isRTL ? 'left-6' : 'right-6'} z-50 animate-slide-in ${
            notification.type === 'success'
              ? 'bg-green-500 dark:bg-green-600 border-green-600 dark:border-green-700'
              : 'bg-red-500 dark:bg-red-600 border-red-600 dark:border-red-700'
          } border-2 text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 max-w-md`}
        >
          {notification.type === 'success' ? (
            <IoCheckmark className="text-2xl flex-shrink-0" />
          ) : (
            <IoAlertCircle className="text-2xl flex-shrink-0" />
          )}
          <p className="font-medium">{notification.message}</p>
          <button
            onClick={() => setNotification({ show: false, type: 'success', message: '' })}
            className="ml-auto hover:bg-white/20 p-1 rounded-lg transition-colors"
          >
            <IoClose className="text-xl" />
          </button>
        </div>
      )}

      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4 group"
        >
          {isRTL ? (
            <>
              <span>رجوع</span>
              <IoArrowBack className="rotate-180 group-hover:translate-x-1 transition-transform" />
            </>
          ) : (
            <>
              <IoArrowBack className="group-hover:-translate-x-1 transition-transform" />
              <span>Back</span>
            </>
          )}
        </button>

        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {isRTL ? 'تعديل الصف' : 'Edit Class'}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {isRTL ? 'قم بتعديل تفاصيل الصف' : 'Update the class details'}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className={sectionCard}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-teal-500/10 dark:bg-teal-500/20 rounded-lg">
              <MdTitle className="text-2xl text-teal-600 dark:text-teal-400" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {isRTL ? 'المعلومات الأساسية' : 'Basic Information'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* English Title */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {isRTL ? 'العنوان (إنجليزي)' : 'Title (English)'}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g. Italian Pasta Making"
                className={`${inputBase} ${
                  errors.title ? 'border-red-500 dark:border-red-400' : ''
                }`}
              />
              {errors.title && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1 flex items-center gap-1">
                  <IoAlertCircle />
                  {errors.title}
                </p>
              )}
            </div>

            {/* Arabic Title */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {isRTL ? 'العنوان (عربي)' : 'Title (Arabic)'}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="titleAr"
                value={formData.titleAr}
                onChange={handleInputChange}
                placeholder="مثال: صنع المعكرونة الإيطالية"
                dir="rtl"
                className={`${inputBase} ${
                  errors.titleAr ? 'border-red-500 dark:border-red-400' : ''
                }`}
              />
              {errors.titleAr && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1 flex items-center gap-1">
                  <IoAlertCircle />
                  {errors.titleAr}
                </p>
              )}
            </div>

            {/* English Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {isRTL ? 'الوصف (إنجليزي)' : 'Description (English)'}
                <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                placeholder="Detailed description of the class..."
                className={`${textareaBase} ${
                  errors.description ? 'border-red-500 dark:border-red-400' : ''
                }`}
              />
              {errors.description && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1 flex items-center gap-1">
                  <IoAlertCircle />
                  {errors.description}
                </p>
              )}
            </div>

            {/* Arabic Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {isRTL ? 'الوصف (عربي)' : 'Description (Arabic)'}
                <span className="text-red-500">*</span>
              </label>
              <textarea
                name="descriptionAr"
                value={formData.descriptionAr}
                onChange={handleInputChange}
                rows={4}
                placeholder="وصف تفصيلي للصف..."
                dir="rtl"
                className={`${textareaBase} ${
                  errors.descriptionAr ? 'border-red-500 dark:border-red-400' : ''
                }`}
              />
              {errors.descriptionAr && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1 flex items-center gap-1">
                  <IoAlertCircle />
                  {errors.descriptionAr}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Category & Details */}
        <div className={sectionCard}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/10 dark:bg-purple-500/20 rounded-lg">
              <MdCategory className="text-2xl text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {isRTL ? 'التصنيف والتفاصيل' : 'Category & Details'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {isRTL ? 'الفئة' : 'Category'}
                <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className={`${selectBase} ${
                  errors.category ? 'border-red-500 dark:border-red-400' : ''
                }`}
              >
                <option value="">{isRTL ? 'اختر الفئة' : 'Select category'}</option>
                <option value="COOKING">
                  {isRTL ? '🍳 طبخ' : '🍳 Cooking'}
                </option>
                <option value="ARTS_CRAFTS">
                  {isRTL ? '🎨 فنون وحرف' : '🎨 Arts & Crafts'}
                </option>
              </select>
              {errors.category && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1 flex items-center gap-1">
                  <IoAlertCircle />
                  {errors.category}
                </p>
              )}
            </div>

            {/* Sub Category */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {isRTL ? 'الفئة الفرعية' : 'Sub Category'}
                <span className="text-red-500">*</span>
              </label>
              <select
                name="subCategory"
                value={formData.subCategory}
                onChange={handleInputChange}
                disabled={!formData.category}
                className={`${selectBase} ${
                  errors.subCategory ? 'border-red-500 dark:border-red-400' : ''
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <option value="">{isRTL ? 'اختر الفئة الفرعية' : 'Select sub-category'}</option>
                {formData.category === 'COOKING' && (
                  <>
                    <option value="APPETIZERS_SNACKS">{isRTL ? 'المقبلات والوجبات الخفيفة' : 'Appetizers & Snacks'}</option>
                    <option value="MAIN_DISHES">{isRTL ? 'أطباق رئيسية' : 'Main Dishes'}</option>
                    <option value="DESSERTS_BAKING">{isRTL ? 'حلويات ومخبوزات' : 'Desserts & Baking'}</option>
                    <option value="MOM_AND_KID">{isRTL ? 'أم وطفل' : 'Mom & Kid'}</option>
                  </>
                )}
                {formData.category === 'ARTS_CRAFTS' && (
                  <>
                    <option value="PAINTING">{isRTL ? 'رسم' : 'Painting'}</option>
                    <option value="CRAFTS">{isRTL ? 'حرف يدوية' : 'Crafts'}</option>
                    <option value="POTTERY">{isRTL ? 'فخار' : 'Pottery'}</option>
                  </>
                )}
              </select>
              {errors.subCategory && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1 flex items-center gap-1">
                  <IoAlertCircle />
                  {errors.subCategory}
                </p>
              )}
            </div>

            {/* Trainer */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {isRTL ? 'المدرب' : 'Trainer'}
                <span className="text-red-500">*</span>
              </label>
              <select
                name="trainerId"
                value={formData.trainerId}
                onChange={handleInputChange}
                className={`${selectBase} ${
                  errors.trainerId ? 'border-red-500 dark:border-red-400' : ''
                }`}
              >
                <option value="">{isRTL ? 'اختر المدرب' : 'Select trainer'}</option>
                {trainers.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.fullName}
                  </option>
                ))}
              </select>
              {errors.trainerId && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1 flex items-center gap-1">
                  <IoAlertCircle />
                  {errors.trainerId}
                </p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {isRTL ? 'الحالة' : 'Status'}
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className={selectBase}
              >
                <option value="DRAFT">{isRTL ? '📝 مسودة' : '📝 Draft'}</option>
                <option value="PUBLISHED">{isRTL ? '✅ منشور' : '✅ Published'}</option>
                <option value="CANCELLED">{isRTL ? '⛔ ملغي' : '⛔ Cancelled'}</option>
                <option value="COMPLETED">{isRTL ? '✅ مكتمل' : '✅ Completed'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pricing & Capacity */}
        <div className={sectionCard}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500/10 dark:bg-green-500/20 rounded-lg">
              <MdAttachMoney className="text-2xl text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {isRTL ? 'السعر والسعة' : 'Pricing & Capacity'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {isRTL ? 'السعر' : 'Price'}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                placeholder="0.00"
                className={`${inputBase} ${
                  errors.price ? 'border-red-500 dark:border-red-400' : ''
                }`}
              />
              {errors.price && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1 flex items-center gap-1">
                  <IoAlertCircle />
                  {errors.price}
                </p>
              )}
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {isRTL ? 'العملة' : 'Currency'}
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                className={selectBase}
              >
                <option value="OMR">OMR</option>
              </select>
            </div>

            {/* Total Seats */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {isRTL ? 'عدد المقاعد' : 'Total Seats'}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="seatsTotal"
                value={formData.seatsTotal}
                onChange={handleInputChange}
                min="1"
                placeholder="e.g. 12"
                className={`${inputBase} ${
                  errors.seatsTotal ? 'border-red-500 dark:border-red-400' : ''
                }`}
              />
              {errors.seatsTotal && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1 flex items-center gap-1">
                  <IoAlertCircle />
                  {errors.seatsTotal}
                </p>
              )}
            </div>

            {/* Duration */}
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {isRTL ? 'المدة (بالدقائق)' : 'Duration (minutes)'}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="durationMinutes"
                value={formData.durationMinutes}
                onChange={handleInputChange}
                min="1"
                placeholder="e.g. 120"
                className={`${inputBase} ${
                  errors.durationMinutes ? 'border-red-500 dark:border-red-400' : ''
                }`}
              />
              {errors.durationMinutes && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1 flex items-center gap-1">
                  <IoAlertCircle />
                  {errors.durationMinutes}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Images */}
        <div className={sectionCard}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg">
              <IoImage className="text-2xl text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {isRTL ? 'الصور' : 'Images'}
            </h2>
          </div>

          {/* Main Image */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {isRTL ? 'الصورة الرئيسية' : 'Main Image'}
              <span className="text-red-500">*</span>
            </label>

            {formData.image ? (
              <div className="relative inline-block">
                <Image
                  src={formData.image}
                  alt="Main"
                  width={300}
                  height={200}
                  className="rounded-lg border border-zinc-200 object-cover"
                />
                <button
                  type="button"
                  onClick={removeMainImage}
                  className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-colors"
                >
                  <IoClose className="text-lg" />
                </button>
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleMainImageUpload}
                    className="hidden"
                    id="change-main-image"
                  />
                  <label
                    htmlFor="change-main-image"
                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500"
                  >
                    <IoCloudUpload className="text-lg" />
                    {isRTL ? 'تغيير الصورة' : 'Change Image'}
                  </label>
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleMainImageUpload}
                  className="hidden"
                  id="main-image-upload"
                />
                <label
                  htmlFor="main-image-upload"
                  className={`flex flex-col items-center justify-center w-full h-48 rounded-lg border border-dashed ${
                    errors.image
                      ? 'border-red-500 dark:border-red-400'
                      : 'border-zinc-300 dark:border-zinc-700'
                  } cursor-pointer bg-white transition hover:border-zinc-400 dark:bg-zinc-900 dark:hover:border-zinc-500`}
                >
                  <IoCloudUpload className="text-5xl text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {isRTL ? 'انقر لتحميل الصورة الرئيسية' : 'Click to upload main image'}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {isRTL ? 'الحد الأقصى 5 ميجابايت' : 'Max 5MB'}
                  </p>
                </label>
              </div>
            )}
            {errors.image && (
              <p className="text-red-600 dark:text-red-400 text-sm mt-2 flex items-center gap-1">
                <IoAlertCircle />
                {errors.image}
              </p>
            )}
          </div>

          {/* Gallery Images */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {isRTL ? 'صور إضافية (اختياري)' : 'Gallery Images (Optional)'}
            </label>

            {allGalleryImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {allGalleryImages.map((img, index) => {
                  const isExisting = index < formData.images.length;
                  return (
                    <div key={index} className="relative">
                      <Image
                        src={img}
                        alt={`Gallery ${index + 1}`}
                        width={200}
                        height={150}
                        className="rounded-lg border border-zinc-200 object-cover w-full h-32"
                      />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(index, isExisting)}
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-lg transition-colors"
                      >
                        <IoClose className="text-sm" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleGalleryImagesUpload}
                className="hidden"
                id="gallery-images-upload"
              />
              <label
                htmlFor="gallery-images-upload"
                className="flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500"
              >
                <IoCloudUpload className="text-xl" />
                {isRTL ? 'إضافة صور' : 'Add Images'}
              </label>
            </div>
          </div>
        </div>

        {/* SEO (Optional) */}
        <div className={sectionCard}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-500/10 dark:bg-orange-500/20 rounded-lg">
              <MdDescription className="text-2xl text-orange-600 dark:text-orange-400" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {isRTL ? 'تحسين محركات البحث (اختياري)' : 'SEO (Optional)'}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {isRTL ? 'عنوان الميتا' : 'Meta Title'}
              </label>
              <input
                type="text"
                name="metaTitle"
                value={formData.metaTitle}
                onChange={handleInputChange}
                placeholder={isRTL ? 'يترك فارغاً لاستخدام العنوان' : 'Leave blank to use title'}
                className={inputBase}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {isRTL ? 'وصف الميتا' : 'Meta Description'}
              </label>
              <textarea
                name="metaDescription"
                value={formData.metaDescription}
                onChange={handleInputChange}
                rows={3}
                placeholder={isRTL ? 'يترك فارغاً لاستخدام الوصف' : 'Leave blank to use description'}
                className={textareaBase}
              />
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {isRTL ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                {uploading
                  ? isRTL
                    ? 'جاري رفع الصور...'
                    : 'Uploading images...'
                  : isRTL
                  ? 'جاري الحفظ...'
                  : 'Saving...'}
              </>
            ) : (
              <>
                <IoCheckmark className="text-xl" />
                {isRTL ? 'حفظ التغييرات' : 'Save Changes'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

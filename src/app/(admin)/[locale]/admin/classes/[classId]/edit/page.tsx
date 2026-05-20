'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  IoArrowBack,
  IoClose,
  IoAlertCircle,
  IoImage,
  IoCloudUpload,
  IoCheckmark
} from 'react-icons/io5';
import {
  MdTitle,
  MdDescription,
  MdCategory,
  MdAttachMoney
} from 'react-icons/md';
import { composeDurationMinutes, splitDurationMinutes } from '@/lib/formatDuration';
import { defaultClassFinanceAdminSettings, type ClassFinanceAdminSettings } from '@/lib/adminSettings';
import { formatNoonDateTimeLocalInput, isQuarterHourDateTimeValue, noonDateTimeLocalInputToIso } from '@/lib/dateTime';
import QuarterHourDateTimeInput from '@/components/admin/QuarterHourDateTimeInput';

type ClassCategory = 'COOKING' | 'ARTS_CRAFTS';
type ClassSubCategory =
  | 'APPETIZERS_SNACKS'
  | 'MAIN_DISHES'
  | 'DESSERTS_BAKING'
  | 'MOM_AND_KID'
  | 'SUMMER_CAMP'
  | 'PAINTING'
  | 'CRAFTS'
  | 'POTTERY';
type ClassStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
type ClassAudienceGender = 'MALE_ONLY' | 'FEMALE_ONLY' | 'MIXED';

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
  audienceGender: ClassAudienceGender;
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
  startDateTime: string;
  endDateTime: string;
  registrationCloseAt: string;
  scheduleSessionsText: string;
  status: ClassStatus;
  metaTitle: string;
  metaDescription: string;
  minimumAge: string;
  showMinimumAge: boolean;
  finalRecipeTitle: string;
  finalRecipeTitleAr: string;
  finalRecipeBrief: string;
  finalRecipeBriefAr: string;
  finalRecipePdf: string;
  finalRecipePdfAr: string;
  finalRecipePdfFile: File | null;
  finalRecipePdfArFile: File | null;
  finalRecipeVisibleToCustomers: boolean;
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
  const pathname = usePathname();
  const router = useRouter();
  const locale = params.locale as string;
  const classId = params.classId as string;

  const isRTL = locale === 'ar';
  const isRenewMode = pathname?.endsWith('/renew') ?? false;

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
    audienceGender: 'FEMALE_ONLY',
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
    startDateTime: '',
    endDateTime: '',
    registrationCloseAt: '',
    scheduleSessionsText: '',
    status: 'DRAFT',
    metaTitle: '',
    metaDescription: '',
    minimumAge: '',
    showMinimumAge: false,
    finalRecipeTitle: '',
    finalRecipeTitleAr: '',
    finalRecipeBrief: '',
    finalRecipeBriefAr: '',
    finalRecipePdf: '',
    finalRecipePdfAr: '',
    finalRecipePdfFile: null,
    finalRecipePdfArFile: null,
    finalRecipeVisibleToCustomers: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [durationParts, setDurationParts] = useState<{ hours: string; minutes: string }>(
    splitDurationMinutes(0)
  );
  const [classFinanceSettings, setClassFinanceSettings] = useState<ClassFinanceAdminSettings>(
    defaultClassFinanceAdminSettings
  );

  const inputBase =
    'w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200';
  const textareaBase =
    'w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200 resize-none';
  const selectBase =
    'w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200';
  const sectionCard =
    'rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900';

  const shouldRedirectToRenew = (data: {
    slug?: string | null;
    status?: string | null;
    startDateTime?: string | null;
    endDateTime?: string | null;
  }) => {
    return (
      !isRenewMode &&
      data.status === 'DRAFT' &&
      !data.startDateTime &&
      !data.endDateTime &&
      typeof data.slug === 'string' &&
      data.slug.includes('-renewal')
    );
  };

  useEffect(() => {
    void Promise.all([fetchClass(), fetchTrainers(), fetchClassFinanceSettings()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const fetchClass = async () => {
    try {
      const res = await fetch(`/api/admin/classes/${classId}`);
      if (!res.ok) throw new Error('Failed to fetch class');
      const data = await res.json();

      if (shouldRedirectToRenew(data)) {
        router.replace(`/${locale}/admin/classes/${classId}/renew`);
        return;
      }
      
      setFormData({
        title: data.title || '',
        titleAr: data.titleAr || '',
        description: data.description || '',
        descriptionAr: data.descriptionAr || '',
        category: data.category || '',
        subCategory: data.subCategory || '',
        audienceGender: data.audienceGender || 'FEMALE_ONLY',
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
        startDateTime: formatNoonDateTimeLocalInput(data.startDateTime),
        endDateTime: formatNoonDateTimeLocalInput(data.endDateTime),
        registrationCloseAt: formatNoonDateTimeLocalInput(data.registrationCloseAt),
        scheduleSessionsText: Array.isArray(data.scheduleSessions)
          ? data.scheduleSessions
              .map((session: { startDateTime?: string; endDateTime?: string }) => {
                const start = formatNoonDateTimeLocalInput(session.startDateTime ?? null);
                const end = formatNoonDateTimeLocalInput(session.endDateTime ?? null);
                return start && end ? `${start}, ${end}` : '';
              })
              .filter(Boolean)
              .join('\n')
          : '',
        status: data.status || 'DRAFT',
        metaTitle: data.metaTitle || '',
        metaDescription: data.metaDescription || '',
        minimumAge: data.minimumAge != null ? data.minimumAge.toString() : '',
        showMinimumAge: data.showMinimumAge || false,
        finalRecipeTitle: data.finalRecipeTitle || '',
        finalRecipeTitleAr: data.finalRecipeTitleAr || '',
        finalRecipeBrief: data.finalRecipeBrief || '',
        finalRecipeBriefAr: data.finalRecipeBriefAr || '',
        finalRecipePdf: data.finalRecipePdf || '',
        finalRecipePdfAr: data.finalRecipePdfAr || '',
        finalRecipePdfFile: null,
        finalRecipePdfArFile: null,
        finalRecipeVisibleToCustomers: data.finalRecipeVisibleToCustomers || false,
      });
      setDurationParts(splitDurationMinutes(data.durationMinutes));
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

  const fetchClassFinanceSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json().catch(() => ({}))) as { classFinance?: ClassFinanceAdminSettings };
      if (data.classFinance) {
        setClassFinanceSettings(data.classFinance);
      }
    } catch (error) {
      console.error('Error fetching class finance settings:', error);
    }
  };

  const formatRate = (value: number) => {
    const normalized = Number(value || 0);
    return normalized.toFixed(3).replace(/\.?0+$/, '');
  };

  const selectedCategoryFinance =
    formData.category === 'ARTS_CRAFTS'
      ? classFinanceSettings.artsCrafts
      : classFinanceSettings.cooking;

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification({ show: false, type: 'success', message: '' }), 5000);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const nextValue = e.target instanceof HTMLInputElement && e.target.type === 'checkbox'
      ? e.target.checked
      : value;
    setFormData((prev) => ({ ...prev, [name]: nextValue }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleDurationPartChange = (field: 'hours' | 'minutes', value: string) => {
    const nextParts =
      field === 'hours'
        ? { ...durationParts, hours: value }
        : { ...durationParts, minutes: value };
    setDurationParts(nextParts);
    setFormData((prev) => ({
      ...prev,
      durationMinutes: String(composeDurationMinutes(nextParts.hours, nextParts.minutes)),
    }));
    if (errors.durationMinutes) {
      setErrors((prev) => ({ ...prev, durationMinutes: '' }));
    }
  };

  const parseScheduleSessions = () => {
    return formData.scheduleSessionsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [startDateTime, endDateTime] = line.split(',').map((part) => part.trim());
        return {
          startDateTime: noonDateTimeLocalInputToIso(startDateTime),
          endDateTime: noonDateTimeLocalInputToIso(endDateTime),
        };
      })
      .filter((session) => session.startDateTime && session.endDateTime);
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

  const handleRecipePdfUpload = (
    field: 'finalRecipePdfFile' | 'finalRecipePdfArFile'
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      showNotification('error', isRTL ? 'يرجى اختيار ملف PDF صالح' : 'Please choose a valid PDF file');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      showNotification('error', isRTL ? 'يجب أن يكون ملف PDF أقل من 20MB' : 'PDF must be less than 20MB');
      return;
    }

    setFormData((prev) => ({ ...prev, [field]: file }));
  };

  const removeRecipePdf = (
    urlField: 'finalRecipePdf' | 'finalRecipePdfAr',
    fileField: 'finalRecipePdfFile' | 'finalRecipePdfArFile'
  ) => {
    setFormData((prev) => ({
      ...prev,
      [urlField]: '',
      [fileField]: null,
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
    if (!formData.startDateTime) newErrors.startDateTime = 'Start date & time is required';
    else if (!isQuarterHourDateTimeValue(formData.startDateTime)) newErrors.startDateTime = 'Minutes must be 00, 15, 30, or 45';
    if (formData.endDateTime && !isQuarterHourDateTimeValue(formData.endDateTime)) newErrors.endDateTime = 'Minutes must be 00, 15, 30, or 45';
    if (formData.registrationCloseAt && !isQuarterHourDateTimeValue(formData.registrationCloseAt)) newErrors.registrationCloseAt = 'Minutes must be 00, 15, 30, or 45';

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

  const uploadRecipePdf = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'classes-recipes');

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      throw new Error('Failed to upload recipe PDF');
    }

    const data = await res.json();
    return data.url;
  };

  const handleSaveAsDraft = async () => {
    if (!formData.title.trim()) {
      showNotification('error', isRTL ? 'العنوان بالإنجليزية مطلوب للحفظ كمسودة' : 'English title is required to save as draft');
      return;
    }

    setSaving(true);
    setUploading(true);

    try {
      let mainImageUrl = formData.image;
      const allGalleryImages = [...formData.images];
      let finalRecipePdfUrl = formData.finalRecipePdf;
      let finalRecipePdfArUrl = formData.finalRecipePdfAr;

      if (formData.imageFile) {
        mainImageUrl = await uploadImage(formData.imageFile);
      }

      if (formData.imageFiles.length > 0) {
        for (const file of formData.imageFiles) {
          const url = await uploadImage(file);
          allGalleryImages.push(url);
        }
      }

      if (formData.finalRecipePdfFile) {
        finalRecipePdfUrl = await uploadRecipePdf(formData.finalRecipePdfFile);
      }

      if (formData.finalRecipePdfArFile) {
        finalRecipePdfArUrl = await uploadRecipePdf(formData.finalRecipePdfArFile);
      }

      setUploading(false);

      const payload = {
        title: formData.title,
        titleAr: formData.titleAr || '',
        description: formData.description || '',
        descriptionAr: formData.descriptionAr || '',
        category: formData.category || null,
        subCategory: formData.subCategory || null,
        audienceGender: formData.audienceGender,
        image: mainImageUrl || null,
        images: allGalleryImages,
        trainerId: formData.trainerId || null,
        price: formData.price ? parseFloat(formData.price) : 0,
        currency: formData.currency,
        seatsTotal: formData.seatsTotal ? parseInt(formData.seatsTotal) : 12,
        durationMinutes: formData.durationMinutes ? parseInt(formData.durationMinutes) : 120,
        startDateTime: noonDateTimeLocalInputToIso(formData.startDateTime),
        endDateTime: noonDateTimeLocalInputToIso(formData.endDateTime),
        registrationCloseAt: noonDateTimeLocalInputToIso(formData.registrationCloseAt),
        scheduleSessions: parseScheduleSessions(),
        status: 'DRAFT',
        metaTitle: formData.metaTitle || formData.title,
        metaDescription: formData.metaDescription || formData.description || '',
        minimumAge: formData.minimumAge ? parseInt(formData.minimumAge) : null,
        showMinimumAge: formData.showMinimumAge,
        finalRecipeTitle: formData.finalRecipeTitle || null,
        finalRecipeTitleAr: formData.finalRecipeTitleAr || null,
        finalRecipeBrief: formData.finalRecipeBrief || null,
        finalRecipeBriefAr: formData.finalRecipeBriefAr || null,
        finalRecipePdf: finalRecipePdfUrl || null,
        finalRecipePdfAr: finalRecipePdfArUrl || null,
        finalRecipeVisibleToCustomers: formData.finalRecipeVisibleToCustomers,
      };

      const res = await fetch(`/api/admin/classes/${classId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save draft');
      }

      showNotification(
        'success',
        isRenewMode
          ? isRTL
            ? 'تم حفظ صف التجديد كمسودة بنجاح!'
            : 'Renewal class draft saved successfully!'
          : isRTL
          ? 'تم حفظ المسودة بنجاح!'
          : 'Draft saved successfully!'
      );
      setTimeout(() => {
        router.push(`/${locale}/admin/classes`);
      }, 1500);
    } catch (error: unknown) {
      console.error('Error saving draft:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save draft';
      showNotification('error', errorMessage);
    } finally {
      setSaving(false);
      setUploading(false);
    }
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
      let finalRecipePdfUrl = formData.finalRecipePdf;
      let finalRecipePdfArUrl = formData.finalRecipePdfAr;

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

      if (formData.finalRecipePdfFile) {
        finalRecipePdfUrl = await uploadRecipePdf(formData.finalRecipePdfFile);
      }

      if (formData.finalRecipePdfArFile) {
        finalRecipePdfArUrl = await uploadRecipePdf(formData.finalRecipePdfArFile);
      }

      setUploading(false);

      const payload = {
        title: formData.title,
        titleAr: formData.titleAr,
        description: formData.description,
        descriptionAr: formData.descriptionAr,
        category: formData.category,
        subCategory: formData.subCategory,
        audienceGender: formData.audienceGender,
        image: mainImageUrl,
        images: allGalleryImages,
        trainerId: formData.trainerId,
        price: parseFloat(formData.price),
        currency: formData.currency,
        seatsTotal: parseInt(formData.seatsTotal),
        durationMinutes: parseInt(formData.durationMinutes),
        startDateTime: noonDateTimeLocalInputToIso(formData.startDateTime),
        endDateTime: noonDateTimeLocalInputToIso(formData.endDateTime),
        registrationCloseAt: noonDateTimeLocalInputToIso(formData.registrationCloseAt),
        scheduleSessions: parseScheduleSessions(),
        status: formData.status,
        metaTitle: formData.metaTitle || formData.title,
        metaDescription: formData.metaDescription || formData.description,
        minimumAge: formData.minimumAge ? parseInt(formData.minimumAge) : null,
        showMinimumAge: formData.showMinimumAge,
        finalRecipeTitle: formData.finalRecipeTitle || null,
        finalRecipeTitleAr: formData.finalRecipeTitleAr || null,
        finalRecipeBrief: formData.finalRecipeBrief || null,
        finalRecipeBriefAr: formData.finalRecipeBriefAr || null,
        finalRecipePdf: finalRecipePdfUrl || null,
        finalRecipePdfAr: finalRecipePdfArUrl || null,
        finalRecipeVisibleToCustomers: formData.finalRecipeVisibleToCustomers,
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

      showNotification(
        'success',
        isRenewMode
          ? isRTL
            ? 'تم حفظ صف التجديد بنجاح!'
            : 'Renewal class saved successfully!'
          : 'Class updated successfully!'
      );
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
          {isRenewMode ? (isRTL ? 'تجديد الصف' : 'Renew Class') : isRTL ? 'تعديل الصف' : 'Edit Class'}
        </h1>
        {isRenewMode ? (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {isRTL
              ? 'يتم إنشاء صف جديد اعتمادا على بيانات الصف السابق. حدّد الموعد الجديد ثم احفظ الصف دون تعديل السجل السابق.'
              : 'You are creating a new class from the previous one. Set the new schedule and save this renewal without editing the original class.'}
          </p>
        ) : null}
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
                    <option value="SUMMER_CAMP">{isRTL ? 'المخيم الصيفي' : 'Summer Camp'}</option>
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

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {isRTL ? 'الفئة المستهدفة' : 'Audience'}
              </label>
              <select
                name="audienceGender"
                value={formData.audienceGender}
                onChange={handleInputChange}
                className={selectBase}
              >
                <option value="MIXED">{isRTL ? 'مشترك' : 'Mixed'}</option>
                <option value="FEMALE_ONLY">{isRTL ? 'للنساء فقط' : 'Women only'}</option>
                <option value="MALE_ONLY">{isRTL ? 'للرجال فقط' : 'Men only'}</option>
              </select>
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

            {/* Start Date & Time */}
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {isRTL ? 'تاريخ ووقت البدء' : 'Start Date & Time'}
                <span className="text-red-500">*</span>
              </label>
              <QuarterHourDateTimeInput
                name="startDateTime"
                value={formData.startDateTime}
                onChange={(value) => setFormData((prev) => ({ ...prev, startDateTime: value }))}
                required
                className={`${inputBase} ${
                  errors.startDateTime ? 'border-red-500 dark:border-red-400' : ''
                }`}
              />
              {errors.startDateTime && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1 flex items-center gap-1">
                  <IoAlertCircle />
                  {errors.startDateTime}
                </p>
              )}
            </div>

            {/* End Date & Time */}
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {isRTL ? 'تاريخ ووقت الانتهاء' : 'End Date & Time'}
              </label>
              <QuarterHourDateTimeInput
                name="endDateTime"
                value={formData.endDateTime}
                onChange={(value) => setFormData((prev) => ({ ...prev, endDateTime: value }))}
                className={inputBase}
              />
            </div>

            {/* Registration Close Date & Time */}
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {isRTL ? 'إغلاق التسجيل' : 'Registration closes at'}
              </label>
              <QuarterHourDateTimeInput
                name="registrationCloseAt"
                value={formData.registrationCloseAt}
                onChange={(value) => setFormData((prev) => ({ ...prev, registrationCloseAt: value }))}
                className={inputBase}
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {isRTL
                  ? 'اختياري. إذا ترك فارغاً، يُغلق التسجيل تلقائياً قبل 24 ساعة من بدء الورشة.'
                  : 'Optional. If left empty, registration closes automatically 24 hours before the workshop starts.'}
              </p>
            </div>

            {formData.subCategory === 'SUMMER_CAMP' ? (
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {isRTL ? 'جدول أيام المخيم' : 'Summer Camp Schedule'}
                </label>
                <textarea
                  name="scheduleSessionsText"
                  value={formData.scheduleSessionsText}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="2026-06-14T10:30, 2026-06-14T12:30&#10;2026-06-15T10:30, 2026-06-15T12:30&#10;2026-06-16T10:30, 2026-06-16T12:30"
                  className={textareaBase}
                />
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {isRTL
                    ? 'كل سطر: وقت البداية، وقت النهاية. مثال: 2026-06-14T10:30, 2026-06-14T12:30'
                    : 'One session per line: start, end. Example: 2026-06-14T10:30, 2026-06-14T12:30'}
                </p>
              </div>
            ) : null}

            {/* Duration */}
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {isRTL ? 'المدة (ساعة:دقيقة)' : 'Duration (HH:MM)'}
                <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={durationParts.hours}
                  onChange={(event) => handleDurationPartChange('hours', event.target.value)}
                  min="0"
                  placeholder={isRTL ? 'ساعة (مثال: 2)' : 'Hours (e.g. 2)'}
                  className={`${inputBase} ${
                    errors.durationMinutes ? 'border-red-500 dark:border-red-400' : ''
                  }`}
                />
                <input
                  type="number"
                  value={durationParts.minutes}
                  onChange={(event) => handleDurationPartChange('minutes', event.target.value)}
                  min="0"
                  max="59"
                  placeholder={isRTL ? 'دقيقة (مثال: 30)' : 'Minutes (e.g. 30)'}
                  className={`${inputBase} ${
                    errors.durationMinutes ? 'border-red-500 dark:border-red-400' : ''
                  }`}
                />
              </div>
              {errors.durationMinutes && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1 flex items-center gap-1">
                  <IoAlertCircle />
                  {errors.durationMinutes}
                </p>
              )}
            </div>

            <div className="md:col-span-3 mt-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900/30 dark:bg-emerald-900/10">
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                  {isRTL ? 'آلية احتساب مالية الورشة' : 'Workshop Finance Rules'}
                </p>
                <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">
                  {isRTL
                    ? `عند التسوية ستحتسب التكاليف الثابتة تلقائياً: استخدام المطبخ = ${formatRate(selectedCategoryFinance.kitchenUsageRatePerHour)} × مدة الورشة بالساعات، ومحتوى الورشة = ${formatRate(selectedCategoryFinance.workshopContentRatePerParticipant)} × عدد المشاركين. تكلفة المواد تضاف يدوياً، ثم تحتسب أتعاب المدرب من المتبقي، ورسوم نون هي ما يتبقى بعد ذلك.`
                    : `At settlement time, fixed costs are calculated automatically: kitchen usage = ${formatRate(selectedCategoryFinance.kitchenUsageRatePerHour)} x workshop duration in hours, and workshop content = ${formatRate(selectedCategoryFinance.workshopContentRatePerParticipant)} x participant count. Material costs are added manually, trainer fee is calculated from the remaining revenue, and Noon fee is whatever remains after that.`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Age Restriction */}
        <div className={sectionCard}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-500/10 dark:bg-amber-500/20 rounded-lg">
              <IoAlertCircle className="text-2xl text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {isRTL ? 'شرط العمر' : 'Age Restriction'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                {isRTL ? 'الحد الأدنى للعمر' : 'Minimum Age'}
              </label>
              <input
                type="number"
                name="minimumAge"
                value={formData.minimumAge}
                onChange={handleInputChange}
                min="1"
                max="99"
                placeholder={isRTL ? 'مثال: 10' : 'e.g. 10'}
                className={inputBase}
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {isRTL
                  ? 'اتركه فارغاً إذا لم يكن هناك شرط عمر. لن يتمكن أحد من التسجيل إذا كان عمره أقل من هذا.'
                  : 'Leave empty for no age restriction. Participants below this age will not be able to register.'}
              </p>
            </div>

            <div className="flex items-center gap-3 self-start mt-6">
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    showMinimumAge: !prev.showMinimumAge,
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.showMinimumAge
                    ? 'bg-teal-600'
                    : 'bg-zinc-300 dark:bg-zinc-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.showMinimumAge
                      ? isRTL ? '-translate-x-6' : 'translate-x-6'
                      : isRTL ? '-translate-x-1' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {isRTL ? 'عرض شرط العمر في صفحة الورشة' : 'Show age restriction on workshop page'}
              </span>
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
                  height={300}
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
                        height={200}
                        className="rounded-lg border border-zinc-200 object-cover w-full aspect-[3/4]"
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

        <div className={sectionCard}>
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2 dark:bg-emerald-500/20">
              <MdDescription className="text-2xl text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {isRTL ? 'الوصفة النهائية للعملاء' : 'Final Customer Recipe'}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{isRTL ? 'المحتوى الإنجليزي' : 'English content'}</h3>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {isRTL ? 'عنوان الوصفة بالإنجليزية' : 'Recipe title in English'}
                </label>
                <input type="text" name="finalRecipeTitle" value={formData.finalRecipeTitle} onChange={handleInputChange} className={inputBase} />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {isRTL ? 'نبذة الوصفة بالإنجليزية' : 'Recipe brief in English'}
                </label>
                <textarea name="finalRecipeBrief" value={formData.finalRecipeBrief} onChange={handleInputChange} rows={4} className={textareaBase} />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {isRTL ? 'ملف الوصفة الإنجليزي (PDF)' : 'English recipe PDF'}
                </label>
                <input type="file" accept="application/pdf" onChange={handleRecipePdfUpload('finalRecipePdfFile')} className="hidden" id="edit-final-recipe-pdf-en-upload" />
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label htmlFor="edit-final-recipe-pdf-en-upload" className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500">
                    {isRTL ? 'رفع PDF إنجليزي' : 'Upload English PDF'}
                  </label>
                  {formData.finalRecipePdfFile ? <span className="text-sm text-zinc-500 dark:text-zinc-400">{formData.finalRecipePdfFile.name}</span> : null}
                  {!formData.finalRecipePdfFile && formData.finalRecipePdf ? (
                    <Link href={formData.finalRecipePdf} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
                      {isRTL ? 'فتح الملف الحالي' : 'Open current file'}
                    </Link>
                  ) : null}
                  {(formData.finalRecipePdfFile || formData.finalRecipePdf) ? (
                    <button type="button" onClick={() => removeRecipePdf('finalRecipePdf', 'finalRecipePdfFile')} className="text-sm font-medium text-rose-600 hover:underline dark:text-rose-400">
                      {isRTL ? 'إزالة' : 'Remove'}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{isRTL ? 'المحتوى العربي' : 'Arabic content'}</h3>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {isRTL ? 'عنوان الوصفة بالعربية' : 'Recipe title in Arabic'}
                </label>
                <input type="text" name="finalRecipeTitleAr" value={formData.finalRecipeTitleAr} onChange={handleInputChange} className={inputBase} />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {isRTL ? 'نبذة الوصفة بالعربية' : 'Recipe brief in Arabic'}
                </label>
                <textarea name="finalRecipeBriefAr" value={formData.finalRecipeBriefAr} onChange={handleInputChange} rows={4} className={textareaBase} />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {isRTL ? 'ملف الوصفة العربي (PDF)' : 'Arabic recipe PDF'}
                </label>
                <input type="file" accept="application/pdf" onChange={handleRecipePdfUpload('finalRecipePdfArFile')} className="hidden" id="edit-final-recipe-pdf-ar-upload" />
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label htmlFor="edit-final-recipe-pdf-ar-upload" className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500">
                    {isRTL ? 'رفع PDF عربي' : 'Upload Arabic PDF'}
                  </label>
                  {formData.finalRecipePdfArFile ? <span className="text-sm text-zinc-500 dark:text-zinc-400">{formData.finalRecipePdfArFile.name}</span> : null}
                  {!formData.finalRecipePdfArFile && formData.finalRecipePdfAr ? (
                    <Link href={formData.finalRecipePdfAr} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
                      {isRTL ? 'فتح الملف الحالي' : 'Open current file'}
                    </Link>
                  ) : null}
                  {(formData.finalRecipePdfArFile || formData.finalRecipePdfAr) ? (
                    <button type="button" onClick={() => removeRecipePdf('finalRecipePdfAr', 'finalRecipePdfArFile')} className="text-sm font-medium text-rose-600 hover:underline dark:text-rose-400">
                      {isRTL ? 'إزالة' : 'Remove'}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <label className="mt-6 flex items-center gap-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              name="finalRecipeVisibleToCustomers"
              checked={formData.finalRecipeVisibleToCustomers}
              onChange={handleInputChange}
              className="h-4 w-4 rounded border-zinc-300 text-teal-700 focus:ring-teal-500"
            />
            <span>{isRTL ? 'إظهار الوصفات في حسابات العملاء' : 'Show recipes in customer accounts'}</span>
          </label>
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
            className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-all duration-200"
          >
            {isRTL ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSaveAsDraft}
            className="rounded-lg border-2 border-amber-500 bg-amber-50 px-5 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-600 dark:hover:bg-amber-950/50 transition-all duration-200"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-amber-400/30 border-t-amber-500" />
                {isRTL ? 'جاري الحفظ...' : 'Saving...'}
              </span>
            ) : (
              isRTL ? 'حفظ كمسودة' : 'Save as Draft'
            )}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-teal-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                {uploading
                  ? isRTL
                    ? 'جاري رفع الصور...'
                    : 'Uploading images...'
                  : isRTL
                  ? 'جاري الحفظ...'
                  : 'Saving...'}
              </span>
            ) : (
              isRenewMode ? (isRTL ? 'حفظ صف التجديد' : 'Save Renewal Class') : isRTL ? 'حفظ التغييرات' : 'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import MarkdownEditor from '@/components/admin/MarkdownEditor';

interface ManualUpcomingCourse {
  id: string;
  title: string;
  titleAr: string;
  dateTime: string;
  price: string;
  currency: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'YOUTUBE';
  mediaUrl: string;
  bookingUrl: string;
  description: string;
}

interface TrainerProfile {
  bio: string;
  expertise: string[];
  experience: number | null;
  socialLinks: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    linkedin?: string;
  };
  shareTiers: Array<{
    minParticipants: number;
    maxParticipants: number | null;
    percent: number;
  }>;
  featuredMediaType: 'IMAGE' | 'VIDEO' | 'YOUTUBE';
  featuredMediaUrl: string | null;
  manualUpcomingCourses: Array<{
    id: string;
    title: string;
    titleAr: string | null;
    dateTime: string | null;
    price: number | null;
    currency: string;
    mediaType?: 'IMAGE' | 'VIDEO' | 'YOUTUBE';
    mediaUrl?: string | null;
    imageUrl: string | null;
    bookingUrl: string | null;
    description: string | null;
  }>;
  isActive: boolean;
}

interface Trainer {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  profileImage: string | null;
  status: string;
  profile: TrainerProfile | null;
}

function toDatetimeLocal(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toYoutubeEmbedUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase();
    if (hostname.includes('youtu.be')) {
      const id = parsed.pathname.replace('/', '').split('/')[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
      const shorts = parsed.pathname.match(/\/shorts\/([^/?]+)/);
      if (shorts?.[1]) return `https://www.youtube.com/embed/${shorts[1]}`;
      const embed = parsed.pathname.match(/\/embed\/([^/?]+)/);
      if (embed?.[1]) return `https://www.youtube.com/embed/${embed[1]}`;
    }
    return null;
  } catch {
    return null;
  }
}

export default function EditTrainerPage() {
  const router = useRouter();
  const params = useParams<{ locale: string; id: string }>();
  const locale = params?.locale ?? 'en';
  const trainerId = params?.id;
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFeaturedMedia, setUploadingFeaturedMedia] = useState(false);
  const [uploadingManualMediaId, setUploadingManualMediaId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [userStatus, setUserStatus] = useState<'ACTIVE' | 'INACTIVE' | 'SUSPENDED'>('ACTIVE');
  const [bio, setBio] = useState('');
  const [expertise, setExpertise] = useState<string[]>([]);
  const [newExpertise, setNewExpertise] = useState('');
  const [experience, setExperience] = useState<number>(0);
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [twitter, setTwitter] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [shareTiers, setShareTiers] = useState<Array<{ minParticipants: number; maxParticipants: number | null; percent: number }>>([
    { minParticipants: 0, maxParticipants: 11, percent: 25 },
    { minParticipants: 12, maxParticipants: null, percent: 30 },
  ]);
  const [featuredMediaType, setFeaturedMediaType] = useState<'IMAGE' | 'VIDEO' | 'YOUTUBE'>('IMAGE');
  const [featuredMediaUrl, setFeaturedMediaUrl] = useState('');
  const [manualUpcomingCourses, setManualUpcomingCourses] = useState<ManualUpcomingCourse[]>([]);
  const [isActive, setIsActive] = useState(true);

  const fetchTrainer = useCallback(async () => {
    if (!trainerId) return;

    try {
      setLoading(true);
      setFeedback(null);

      const response = await fetch(`/api/admin/trainers/${trainerId}`);
      if (!response.ok) throw new Error('Failed to fetch trainer');
      
      const data = (await response.json()) as Trainer;
      setTrainer(data);
      setFullName(data.fullName || '');
      setPhoneNumber(data.phoneNumber || '');
      setProfileImage(data.profileImage || '');
      setUserStatus((data.status || 'ACTIVE') as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED');
      
      // Set form values
      if (data.profile) {
        setBio(data.profile.bio || '');
        setExpertise(data.profile.expertise || []);
        setExperience(data.profile.experience || 0);
        setInstagram(data.profile.socialLinks?.instagram || '');
        setFacebook(data.profile.socialLinks?.facebook || '');
        setTwitter(data.profile.socialLinks?.twitter || '');
        setLinkedin(data.profile.socialLinks?.linkedin || '');
        setShareTiers(
          Array.isArray(data.profile.shareTiers) && data.profile.shareTiers.length > 0
            ? data.profile.shareTiers
            : [
                { minParticipants: 0, maxParticipants: 11, percent: 25 },
                { minParticipants: 12, maxParticipants: null, percent: 30 },
              ]
        );
        setFeaturedMediaType(
          data.profile.featuredMediaType === 'YOUTUBE'
            ? 'YOUTUBE'
            : data.profile.featuredMediaType === 'VIDEO'
              ? 'VIDEO'
              : 'IMAGE'
        );
        setFeaturedMediaUrl(data.profile.featuredMediaUrl || '');
        setManualUpcomingCourses(
          Array.isArray(data.profile.manualUpcomingCourses)
            ? data.profile.manualUpcomingCourses.map((course, index: number) => ({
                id: typeof course.id === 'string' ? course.id : `manual-${index + 1}`,
                title: typeof course.title === 'string' ? course.title : '',
                titleAr: typeof course.titleAr === 'string' ? course.titleAr : '',
                dateTime: toDatetimeLocal(typeof course.dateTime === 'string' ? course.dateTime : null),
                price: typeof course.price === 'number' && Number.isFinite(course.price) ? String(course.price) : '',
                currency: typeof course.currency === 'string' ? course.currency : 'OMR',
                mediaType:
                  course.mediaType === 'YOUTUBE'
                    ? 'YOUTUBE'
                    : course.mediaType === 'VIDEO'
                      ? 'VIDEO'
                      : 'IMAGE',
                mediaUrl:
                  typeof course.mediaUrl === 'string'
                    ? course.mediaUrl
                    : typeof course.imageUrl === 'string'
                      ? course.imageUrl
                      : '',
                bookingUrl: typeof course.bookingUrl === 'string' ? course.bookingUrl : '',
                description: typeof course.description === 'string' ? course.description : '',
              }))
            : []
        );
        setIsActive(data.profile.isActive ?? true);
      } else {
        setBio('');
        setExpertise([]);
        setExperience(0);
        setInstagram('');
        setFacebook('');
        setTwitter('');
        setLinkedin('');
        setShareTiers([
          { minParticipants: 0, maxParticipants: 11, percent: 25 },
          { minParticipants: 12, maxParticipants: null, percent: 30 },
        ]);
        setFeaturedMediaType('IMAGE');
        setFeaturedMediaUrl('');
        setManualUpcomingCourses([]);
        setIsActive(true);
      }
    } catch (error) {
      console.error('Error fetching trainer:', error);
      setFeedback({ type: 'error', message: 'Failed to load trainer details.' });
    } finally {
      setLoading(false);
    }
  }, [trainerId]);

  useEffect(() => {
    if (trainerId) {
      void fetchTrainer();
    }
  }, [trainerId, fetchTrainer]);

  const handleAddExpertise = () => {
    if (newExpertise.trim() && !expertise.includes(newExpertise.trim())) {
      setExpertise([...expertise, newExpertise.trim()]);
      setNewExpertise('');
    }
  };

  const handleRemoveExpertise = (item: string) => {
    setExpertise(expertise.filter(e => e !== item));
  };

  const addManualUpcomingCourse = () => {
    setManualUpcomingCourses((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}-${prev.length + 1}`,
        title: '',
        titleAr: '',
        dateTime: '',
        price: '',
        currency: 'OMR',
        mediaType: 'IMAGE',
        mediaUrl: '',
        bookingUrl: '',
        description: '',
      },
    ]);
  };

  const removeManualUpcomingCourse = (id: string) => {
    setManualUpcomingCourses((prev) => prev.filter((item) => item.id !== id));
  };

  const updateManualUpcomingCourse = (id: string, field: keyof ManualUpcomingCourse, value: string) => {
    setManualUpcomingCourses((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const uploadMedia = async (file: File, folder = 'profiles'): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || !data?.url) {
      throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to upload media');
    }

    return data.url as string;
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      setFeedback(null);
      const imageUrl = await uploadMedia(file, 'profiles');
      setProfileImage(imageUrl);
      setFeedback({ type: 'success', message: 'Profile image uploaded successfully.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to upload profile image.',
      });
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleFeaturedMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingFeaturedMedia(true);
      setFeedback(null);
      const mediaUrl = await uploadMedia(file, 'trainer-media');
      setFeaturedMediaUrl(mediaUrl);
      setFeedback({ type: 'success', message: 'Featured media uploaded successfully.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to upload featured media.',
      });
    } finally {
      setUploadingFeaturedMedia(false);
      e.target.value = '';
    }
  };

  const handleManualCourseMediaUpload = async (courseId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingManualMediaId(courseId);
      setFeedback(null);
      const mediaUrl = await uploadMedia(file, 'trainer-manual-courses');
      updateManualUpcomingCourse(courseId, 'mediaUrl', mediaUrl);
      setFeedback({ type: 'success', message: 'Course media uploaded successfully.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to upload course media.',
      });
    } finally {
      setUploadingManualMediaId(null);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainerId) return;

    try {
      setSaving(true);
      setFeedback(null);

      const response = await fetch(`/api/admin/trainers/${trainerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          phoneNumber,
          profileImage,
          status: userStatus,
          bio,
          expertise,
          experience: experience || null,
          socialLinks: {
            instagram: instagram || undefined,
            facebook: facebook || undefined,
            twitter: twitter || undefined,
            linkedin: linkedin || undefined,
          },
          shareTiers,
          featuredMediaType,
          featuredMediaUrl: featuredMediaUrl || null,
          manualUpcomingCourses: manualUpcomingCourses.map((course) => ({
            id: course.id,
            title: course.title,
            titleAr: course.titleAr || null,
            dateTime: course.dateTime || null,
            price: course.price === '' ? null : Number(course.price),
            currency: course.currency || 'OMR',
            mediaType: course.mediaType,
            mediaUrl: course.mediaUrl || null,
            imageUrl: course.mediaType === 'IMAGE' ? course.mediaUrl || null : null,
            bookingUrl: course.bookingUrl || null,
            description: course.description || null,
          })),
          isActive,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to update trainer');
      }

      setFeedback({ type: 'success', message: 'Trainer profile updated successfully.' });
      router.push(`/${locale}/admin/trainers`);
      router.refresh();
    } catch (error) {
      console.error('Error updating trainer:', error);
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update trainer profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  const youtubePreviewUrl = featuredMediaType === 'YOUTUBE' ? toYoutubeEmbedUrl(featuredMediaUrl) : null;
  const featuredVideoPreviewUrl = featuredMediaType === 'VIDEO' ? featuredMediaUrl.trim() : null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-600 dark:border-zinc-700 dark:border-t-blue-500"></div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading trainer...</p>
        </div>
      </div>
    );
  }

  if (!trainer) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Trainer not found</p>
          <Link
            href={`/${locale}/admin/trainers`}
            className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Back to Trainers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            Edit Trainer Profile
          </h1>
        </div>
        <Link
          href={`/${locale}/admin/trainers`}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </Link>
      </div>

      {feedback && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-300'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            Basic Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Email
                </label>
                <input
                  type="email"
                  value={trainer.email}
                  disabled
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Phone
                </label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Phone number"
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Profile Image URL
                </label>
                <input
                  type="text"
                  value={profileImage}
                  onChange={(e) => setProfileImage(e.target.value)}
                  placeholder="/uploads/profiles/... or https://..."
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
                <div className="mt-3 flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700">
                    {uploadingImage ? 'Uploading...' : 'Upload Image'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfileImageUpload}
                      disabled={uploadingImage}
                    />
                  </label>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">PNG, JPG, WEBP</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  User Status
                </label>
                <select
                  value={userStatus}
                  onChange={(e) => setUserStatus(e.target.value as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED')}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </div>
            </div>
            {profileImage && (
              <div>
                <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Image Preview</p>
                <div className="relative h-24 w-24 overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-700">
                  <Image
                    src={profileImage}
                    alt={fullName || 'Trainer profile image'}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            Biography
          </h2>
          <MarkdownEditor
            label=""
            value={bio}
            onChange={setBio}
            rows={12}
            placeholder="Write biography in Markdown..."
          />
        </div>

        {/* Expertise */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            Areas of Expertise
          </h2>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newExpertise}
                onChange={(e) => setNewExpertise(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddExpertise())}
                placeholder="e.g., Italian Cuisine, Baking, Pastry..."
                className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddExpertise}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Add
              </button>
            </div>
            {expertise.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {expertise.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => handleRemoveExpertise(item)}
                      className="ml-1 hover:text-blue-900 dark:hover:text-blue-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Experience */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            Years of Experience
          </h2>
          <input
            type="number"
            value={experience}
            onChange={(e) => setExperience(parseInt(e.target.value) || 0)}
            min="0"
            max="50"
            className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white sm:w-48"
          />
        </div>

        {/* Social Links */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            Social Media Links
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Instagram
              </label>
              <input
                type="url"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="https://instagram.com/username"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Facebook
              </label>
              <input
                type="url"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="https://facebook.com/username"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Twitter
              </label>
              <input
                type="url"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                placeholder="https://twitter.com/username"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                LinkedIn
              </label>
              <input
                type="url"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/username"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            Trainer Featured Media
          </h2>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            Choose whether the public trainer page shows an uploaded image, uploaded video, or embedded YouTube video.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Media Type
              </label>
              <select
                value={featuredMediaType}
                onChange={(e) => setFeaturedMediaType(e.target.value as 'IMAGE' | 'VIDEO' | 'YOUTUBE')}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              >
                <option value="IMAGE">Image</option>
                <option value="VIDEO">Video (Upload)</option>
                <option value="YOUTUBE">YouTube Video</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {featuredMediaType === 'YOUTUBE'
                  ? 'YouTube URL'
                  : featuredMediaType === 'VIDEO'
                    ? 'Video URL'
                    : 'Image URL'}
              </label>
              <input
                type="url"
                value={featuredMediaUrl}
                onChange={(e) => setFeaturedMediaUrl(e.target.value)}
                placeholder={featuredMediaType === 'YOUTUBE' ? 'https://youtu.be/...' : '/uploads/... or https://...'}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
              {featuredMediaType !== 'YOUTUBE' ? (
                <div className="mt-3 flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700">
                    {uploadingFeaturedMedia ? 'Uploading...' : featuredMediaType === 'VIDEO' ? 'Upload Video' : 'Upload Image'}
                    <input
                      type="file"
                      accept={featuredMediaType === 'VIDEO' ? 'video/*' : 'image/*'}
                      className="hidden"
                      onChange={handleFeaturedMediaUpload}
                      disabled={uploadingFeaturedMedia}
                    />
                  </label>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {featuredMediaType === 'VIDEO' ? 'MP4, MOV, WEBM (max 50MB)' : 'PNG, JPG, WEBP (max 5MB)'}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
          {featuredMediaUrl ? (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Preview</p>
              {featuredMediaType === 'YOUTUBE' ? (
                youtubePreviewUrl ? (
                  <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <iframe
                      src={youtubePreviewUrl}
                      title="Trainer featured video preview"
                      className="aspect-video w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <p className="text-xs text-rose-600 dark:text-rose-400">
                    Enter a valid YouTube URL to preview.
                  </p>
                )
              ) : featuredMediaType === 'VIDEO' ? (
                <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <video
                    src={featuredVideoPreviewUrl || undefined}
                    controls
                    className="aspect-video w-full bg-black"
                  />
                </div>
              ) : (
                <div className="relative h-44 w-full max-w-md overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <Image
                    src={featuredMediaUrl}
                    alt="Trainer featured media"
                    fill
                    sizes="(max-width: 768px) 100vw, 512px"
                    className="object-cover"
                  />
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Manual Upcoming Courses
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Add unlimited upcoming courses that will appear on the trainer public page.
              </p>
            </div>
            <button
              type="button"
              onClick={addManualUpcomingCourse}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Add Course
            </button>
          </div>

          {manualUpcomingCourses.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              No manual upcoming courses added yet.
            </div>
          ) : (
            <div className="space-y-4">
              {manualUpcomingCourses.map((course, index) => (
                <div key={course.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                      Course #{index + 1}
                    </h3>
                    <button
                      type="button"
                      onClick={() => removeManualUpcomingCourse(course.id)}
                      className="rounded-md border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/20"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm">
                      <span className="text-zinc-700 dark:text-zinc-300">Title (EN)</span>
                      <input
                        type="text"
                        value={course.title}
                        onChange={(e) => updateManualUpcomingCourse(course.id, 'title', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="text-zinc-700 dark:text-zinc-300">Title (AR)</span>
                      <input
                        type="text"
                        value={course.titleAr}
                        onChange={(e) => updateManualUpcomingCourse(course.id, 'titleAr', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="text-zinc-700 dark:text-zinc-300">Date & Time</span>
                      <input
                        type="datetime-local"
                        value={course.dateTime}
                        onChange={(e) => updateManualUpcomingCourse(course.id, 'dateTime', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-sm">
                        <span className="text-zinc-700 dark:text-zinc-300">Price</span>
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={course.price}
                          onChange={(e) => updateManualUpcomingCourse(course.id, 'price', e.target.value)}
                          className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        />
                      </label>
                      <label className="text-sm">
                        <span className="text-zinc-700 dark:text-zinc-300">Currency</span>
                        <input
                          type="text"
                          value={course.currency}
                          onChange={(e) => updateManualUpcomingCourse(course.id, 'currency', e.target.value)}
                          className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm uppercase focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        />
                      </label>
                    </div>
                    <label className="text-sm sm:col-span-2">
                      <span className="text-zinc-700 dark:text-zinc-300">Media Type</span>
                      <select
                        value={course.mediaType}
                        onChange={(e) =>
                          updateManualUpcomingCourse(
                            course.id,
                            'mediaType',
                            e.target.value as 'IMAGE' | 'VIDEO' | 'YOUTUBE'
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                      >
                        <option value="IMAGE">Image</option>
                        <option value="VIDEO">Video (Upload)</option>
                        <option value="YOUTUBE">YouTube Video</option>
                      </select>
                    </label>
                    <label className="text-sm sm:col-span-2">
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {course.mediaType === 'YOUTUBE'
                          ? 'YouTube URL'
                          : course.mediaType === 'VIDEO'
                            ? 'Video URL'
                            : 'Image URL'}
                      </span>
                      <input
                        type="url"
                        value={course.mediaUrl}
                        onChange={(e) => updateManualUpcomingCourse(course.id, 'mediaUrl', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                      />
                      {course.mediaType !== 'YOUTUBE' ? (
                        <div className="mt-2 flex items-center gap-3">
                          <label className="inline-flex cursor-pointer items-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700">
                            {uploadingManualMediaId === course.id ? 'Uploading...' : course.mediaType === 'VIDEO' ? 'Upload Video' : 'Upload Image'}
                            <input
                              type="file"
                              accept={course.mediaType === 'VIDEO' ? 'video/*' : 'image/*'}
                              className="hidden"
                              onChange={(e) => void handleManualCourseMediaUpload(course.id, e)}
                              disabled={uploadingManualMediaId === course.id}
                            />
                          </label>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {course.mediaType === 'VIDEO' ? 'max 50MB' : 'max 5MB'}
                          </span>
                        </div>
                      ) : null}
                      {course.mediaUrl ? (
                        <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                          {course.mediaType === 'YOUTUBE' ? (
                            toYoutubeEmbedUrl(course.mediaUrl) ? (
                              <iframe
                                src={toYoutubeEmbedUrl(course.mediaUrl) || undefined}
                                title={`Course ${index + 1} media preview`}
                                className="aspect-video w-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            ) : (
                              <p className="p-3 text-xs text-rose-600 dark:text-rose-400">
                                Enter a valid YouTube URL.
                              </p>
                            )
                          ) : course.mediaType === 'VIDEO' ? (
                            <video
                              src={course.mediaUrl}
                              controls
                              className="aspect-video w-full bg-black"
                            />
                          ) : (
                            <div className="relative aspect-video w-full">
                              <Image
                                src={course.mediaUrl}
                                alt={`Course ${index + 1} media preview`}
                                fill
                                sizes="(max-width: 768px) 100vw, 640px"
                                className="object-cover"
                              />
                            </div>
                          )}
                        </div>
                      ) : null}
                    </label>
                    <label className="text-sm sm:col-span-2">
                      <span className="text-zinc-700 dark:text-zinc-300">Booking URL</span>
                      <input
                        type="url"
                        value={course.bookingUrl}
                        onChange={(e) => updateManualUpcomingCourse(course.id, 'bookingUrl', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                      />
                    </label>
                    <label className="text-sm sm:col-span-2">
                      <span className="text-zinc-700 dark:text-zinc-300">Description</span>
                      <textarea
                        value={course.description}
                        onChange={(e) => updateManualUpcomingCourse(course.id, 'description', e.target.value)}
                        rows={3}
                        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            Trainer Share Tiers
          </h2>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            Configure the trainer percentage by participant count. These percentages are used in class settlement after fixed and material costs.
          </p>
          <div className="space-y-3">
            {shareTiers.map((tier, index) => (
              <div key={`tier-${index}`} className="grid gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <label className="text-sm">
                  <span className="block text-zinc-700 dark:text-zinc-300">Min Participants</span>
                  <input
                    type="number"
                    min="0"
                    value={tier.minParticipants}
                    onChange={(e) =>
                      setShareTiers((prev) =>
                        prev.map((item, rowIndex) =>
                          rowIndex === index ? { ...item, minParticipants: Math.max(0, Number(e.target.value || 0)) } : item
                        )
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </label>
                <label className="text-sm">
                  <span className="block text-zinc-700 dark:text-zinc-300">Max Participants</span>
                  <input
                    type="number"
                    min={tier.minParticipants}
                    value={tier.maxParticipants ?? ''}
                    onChange={(e) =>
                      setShareTiers((prev) =>
                        prev.map((item, rowIndex) =>
                          rowIndex === index
                            ? {
                                ...item,
                                maxParticipants: e.target.value === '' ? null : Math.max(item.minParticipants, Number(e.target.value || item.minParticipants)),
                              }
                            : item
                        )
                      )
                    }
                    placeholder="Leave empty for no upper limit"
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </label>
                <label className="text-sm">
                  <span className="block text-zinc-700 dark:text-zinc-300">Percent</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={tier.percent}
                    onChange={(e) =>
                      setShareTiers((prev) =>
                        prev.map((item, rowIndex) =>
                          rowIndex === index ? { ...item, percent: Math.min(100, Math.max(0, Number(e.target.value || 0))) } : item
                        )
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => setShareTiers((prev) => (prev.length > 1 ? prev.filter((_, rowIndex) => rowIndex !== index) : prev))}
                    className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/20"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setShareTiers((prev) => [
                  ...prev,
                  {
                    minParticipants: prev.length > 0 ? (prev[prev.length - 1].maxParticipants ?? prev[prev.length - 1].minParticipants) + 1 : 0,
                    maxParticipants: null,
                    percent: 0,
                  },
                ])
              }
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Add Tier
            </button>
          </div>
        </div>

        {/* Status */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600"
            />
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Active Trainer (appears in trainer listings)
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3 font-semibold text-white shadow-sm transition-all hover:from-blue-700 hover:to-cyan-700 hover:shadow-md disabled:opacity-50 sm:flex-initial"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}

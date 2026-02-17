'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import MarkdownEditor from '@/components/admin/MarkdownEditor';

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

export default function EditTrainerPage() {
  const router = useRouter();
  const params = useParams<{ locale: string; id: string }>();
  const locale = params?.locale ?? 'en';
  const trainerId = params?.id;
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
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
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (trainerId) {
      fetchTrainer();
    }
  }, [trainerId]);

  const fetchTrainer = async () => {
    if (!trainerId) return;

    try {
      setLoading(true);
      setFeedback(null);

      const response = await fetch(`/api/admin/trainers/${trainerId}`);
      if (!response.ok) throw new Error('Failed to fetch trainer');
      
      const data = await response.json();
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
        setIsActive(data.profile.isActive ?? true);
      } else {
        setBio('');
        setExpertise([]);
        setExperience(0);
        setInstagram('');
        setFacebook('');
        setTwitter('');
        setLinkedin('');
        setIsActive(true);
      }
    } catch (error) {
      console.error('Error fetching trainer:', error);
      setFeedback({ type: 'error', message: 'Failed to load trainer details.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpertise = () => {
    if (newExpertise.trim() && !expertise.includes(newExpertise.trim())) {
      setExpertise([...expertise, newExpertise.trim()]);
      setNewExpertise('');
    }
  };

  const handleRemoveExpertise = (item: string) => {
    setExpertise(expertise.filter(e => e !== item));
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'profiles');

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || !data?.url) {
      throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to upload image');
    }

    return data.url as string;
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      setFeedback(null);
      const imageUrl = await uploadImage(file);
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
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {trainer.fullName}
          </p>
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

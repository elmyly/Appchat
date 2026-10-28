import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Report } from '../types';
import {
  ShieldAlert,
  Users,
  FileText,
  Image as ImageIcon,
  FolderOpen,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Megaphone,
  Ban,
  Clock,
} from 'lucide-react';

export const AdminView: React.FC = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState<{
    totalUsers: number;
    totalPosts: number;
    totalVisuals: number;
    totalBoards: number;
    pendingReports: number;
  }>({
    totalUsers: 0,
    totalPosts: 0,
    totalVisuals: 0,
    totalBoards: 0,
    pendingReports: 0,
  });

  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementSuccess, setAnnouncementSuccess] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchAdminData = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const [statsRes, reportsRes] = await Promise.all([
        fetch('/api/admin/stats', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/admin/reports', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (statsRes.ok) {
        const s = await statsRes.json();
        setStats(s.stats || s);
      }
      if (reportsRes.ok) {
        const r = await reportsRes.json();
        setReports(r.reports || r || []);
      }
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  const handleReportAction = async (
    reportId: string,
    action: 'dismiss' | 'delete_content' | 'suspend_user'
  ) => {
    if (!token) return;
    const targetReport = reports.find((r) => r.id === reportId);
    if (!targetReport) return;

    setActionInProgress(reportId);
    try {
      if (action === 'dismiss') {
        await fetch(`/api/admin/reports/${reportId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: 'dismissed' }),
        });
      } else if (action === 'delete_content') {
        if (targetReport.targetType === 'post') {
          await fetch(`/api/admin/posts/${targetReport.targetId}/moderate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ action: 'delete' }),
          });
        }
        await fetch(`/api/admin/reports/${reportId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: 'resolved' }),
        });
      } else if (action === 'suspend_user') {
        await fetch(`/api/admin/users/${targetReport.targetId}/suspend`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        await fetch(`/api/admin/reports/${reportId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: 'resolved' }),
        });
      }

      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? {
                ...r,
                status: (action === 'dismiss' ? 'dismissed' : 'resolved') as Report['status'],
              }
            : r
        )
      );
      // refresh stats
      setStats((prev) => ({
        ...prev,
        pendingReports: Math.max(0, prev.pendingReports - 1),
      }));
    } catch (err) {
      console.error('Action failed', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim() || !token) return;

    try {
      const res = await fetch('/api/social/admin/announcement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: announcementText.trim() }),
      });

      if (res.ok) {
        setAnnouncementSuccess(true);
        setAnnouncementText('');
        setTimeout(() => setAnnouncementSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to send announcement', err);
    }
  };

  return (
    <div className="flex-1 max-w-4xl min-h-screen border-r border-slate-100 bg-white p-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Aura Administration & Safety</h1>
            <p className="text-xs text-slate-500">
              Platform metrics, safety moderation, community reports, and global announcements.
            </p>
          </div>
        </div>
        <button
          onClick={fetchAdminData}
          className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Total Users</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-xl font-bold text-slate-900">{stats.totalUsers}</p>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Total Posts</span>
            <FileText className="w-4 h-4 text-[#5036FF]" />
          </div>
          <p className="text-xl font-bold text-slate-900">{stats.totalPosts}</p>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Visual Pins</span>
            <ImageIcon className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-slate-900">{stats.totalVisuals}</p>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Boards</span>
            <FolderOpen className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-slate-900">{stats.totalBoards}</p>
        </div>

        <div className="p-3.5 bg-rose-50/50 rounded-2xl border border-rose-100 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-rose-500 mb-1">
            <span className="text-[11px] font-semibold">Pending Reports</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xl font-bold text-rose-700">{stats.pendingReports}</p>
        </div>
      </div>

      {/* Broadcast Announcement Bar */}
      <div className="p-5 bg-gradient-to-r from-indigo-500 to-[#5036FF] rounded-2xl text-white mb-8 shadow-sm">
        <div className="flex items-center gap-2 mb-2 font-bold text-sm">
          <Megaphone className="w-4 h-4" />
          Broadcast System Announcement
        </div>
        <p className="text-xs text-indigo-100 mb-3">
          Sends a high-priority notification to all registered Aura accounts simultaneously.
        </p>

        {announcementSuccess && (
          <div className="mb-3 p-2 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-xs text-emerald-100 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Announcement dispatched to all users successfully!
          </div>
        )}

        <form onSubmit={handleSendAnnouncement} className="flex gap-2">
          <input
            type="text"
            placeholder="Type platform announcement..."
            value={announcementText}
            onChange={(e) => setAnnouncementText(e.target.value)}
            className="flex-1 px-3.5 py-2 rounded-xl text-xs bg-white text-slate-800 placeholder-slate-400 outline-none"
          />
          <button
            type="submit"
            disabled={!announcementText.trim()}
            className="px-4 py-2 bg-white text-[#5036FF] hover:bg-indigo-50 font-semibold text-xs rounded-xl disabled:opacity-50 transition-colors"
          >
            Broadcast
          </button>
        </form>
      </div>

      {/* Reports Moderation List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          Community Reports ({reports.length})
        </h2>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading reports queue...</div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-100 text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold">Inbox Zero</p>
            <p className="text-xs text-slate-400 mt-0.5">
              All community reports have been resolved. The platform is healthy.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {report.targetType.toUpperCase()} #{report.targetId.slice(0, 8)}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                          report.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : report.status === 'resolved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {report.status}
                      </span>
                    </div>
                    <p className="text-xs text-rose-600 font-semibold mt-1">
                      Reason: {report.reason}
                    </p>
                    {report.details && (
                      <p className="text-xs text-slate-600 mt-1 italic">
                        "{report.details}"
                      </p>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(report.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {report.status === 'pending' && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                    <button
                      onClick={() => handleReportAction(report.id, 'dismiss')}
                      disabled={actionInProgress === report.id}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => handleReportAction(report.id, 'delete_content')}
                      disabled={actionInProgress === report.id}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 rounded-xl transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Content
                    </button>
                    <button
                      onClick={() => handleReportAction(report.id, 'suspend_user')}
                      disabled={actionInProgress === report.id}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors flex items-center gap-1"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      Suspend User
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

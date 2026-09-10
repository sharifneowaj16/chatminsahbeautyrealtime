'use client';





import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { useState, useEffect } from 'react';
import {
  MessageCircle,
  CheckCircle,
  XCircle,
  Clock,
  QrCode,
  Smartphone,
  Link,
  Settings,
  Bell,
  Send,
  ChevronRight,
} from 'lucide-react';

interface WhatsAppAccount {
  id: string;
  phoneNumber: string;
  businessName: string;
  status: 'connected' | 'disconnected' | 'pending';
  qrCode?: string;
  lastSync?: string;
  messageCount: {
    sent: number;
    received: number;
    today: number;
  };
  settings: {
    autoReply: boolean;
    autoReplyMessage?: string;
    businessHours: {
      enabled: boolean;
      start: string;
      end: string;
      timezone: string;
    };
    awayMessage?: string;
  };
}

export default function WhatsAppIntegration() {
  const { requestConfirmation } = useToast();
  const [account, setAccount] = useState<WhatsAppAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadWhatsAppAccount();
  }, []);

  const loadWhatsAppAccount = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAccount({
        id: 'wa-001',
        phoneNumber: '+1234567890',
        businessName: 'Minsah Beauty',
        status: 'connected',
        lastSync: new Date().toISOString(),
        messageCount: {
          sent: 1234,
          received: 890,
          today: 45,
        },
        settings: {
          autoReply: true,
          autoReplyMessage: 'Thank you for contacting Minsah Beauty! We will get back to you soon.',
          businessHours: {
            enabled: true,
            start: '09:00',
            end: '18:00',
            timezone: 'UTC',
          },
          awayMessage: 'We are currently offline. We will respond during business hours.',
        },
      });
    } catch (error) {
      console.error('Error loading WhatsApp account:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      // Simulate QR code generation
      await new Promise(resolve => setTimeout(resolve, 1500));
      setShowQR(true);
      setAccount(prev => prev ? { ...prev, status: 'pending' } : null);
    } catch (error) {
      console.error('Error connecting WhatsApp:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!(await requestConfirmation({ title: 'Disconnect WhatsApp?', description: 'New messages will stop syncing until WhatsApp is connected again.', confirmLabel: 'Disconnect', tone: 'danger' }))) return;
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAccount(prev => prev ? { ...prev, status: 'disconnected' } : null);
    } catch (error) {
      console.error('Error disconnecting WhatsApp:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !account) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/[0.12] rounded w-64"></div>
          <div className="h-64 bg-white/[0.12] rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#f7f8f8]">WhatsApp Business Integration</h2>
          <p className="text-[#8a8f98] text-sm">Connect and manage your WhatsApp Business account</p>
        </div>
        {account && account.status === 'connected' && (
          <Button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-4 py-2 border border-[#232636] rounded-lg hover:bg-[#10121b]"
          >
            <Settings className="w-5 h-5" />
            Settings
          </Button>
        )}
      </div>

      {/* Connection Status */}
      {!account || account.status === 'disconnected' ? (
        <div className="bg-[#161824] border border-[#232636] rounded-lg p-8">
          <div className="text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-[#f7f8f8] mb-2">Connect WhatsApp Business</h3>
            <p className="text-[#8a8f98] mb-6">
              Connect your WhatsApp Business account to send and receive messages directly from your admin dashboard.
            </p>
            <Button
              onClick={handleConnect}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2 mx-auto"
            >
              <Link className="w-5 h-5" />
              Connect WhatsApp
            </Button>
          </div>
        </div>
      ) : account.status === 'pending' ? (
        <div className="bg-[#161824] border border-[#232636] rounded-lg p-8">
          <div className="text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-8 h-8 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold text-[#f7f8f8] mb-2">Scan QR Code</h3>
            <p className="text-[#8a8f98] mb-6">
              Open WhatsApp on your phone, go to Settings <ChevronRight className="w-4 h-4 inline mx-1" /> Linked Devices <ChevronRight className="w-4 h-4 inline mx-1" /> Link a Device, and scan this QR code.
            </p>
            {showQR && (
              <div className="bg-[#10121b] rounded-lg p-8 mb-4 flex items-center justify-center">
                <div className="w-64 h-64 bg-[#161824] border-4 border-[#232636] rounded-lg flex items-center justify-center">
                  <QrCode className="w-32 h-32 text-[#62666d]" />
                </div>
              </div>
            )}
            <Button
              onClick={() => setShowQR(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Show QR Code
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-green-100 text-sm font-medium">Status</span>
                <CheckCircle className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold">Connected</p>
              <p className="text-green-100 text-xs mt-1">{account.phoneNumber}</p>
            </div>

            <div className="bg-[#161824] border border-[#232636] rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8a8f98] text-sm font-medium">Messages Sent</span>
                <Send className="w-5 h-5 text-[#62666d]" />
              </div>
              <p className="text-2xl font-bold text-[#f7f8f8]">{account.messageCount.sent.toLocaleString()}</p>
              <p className="text-[#8a8f98] text-xs mt-1">Total sent</p>
            </div>

            <div className="bg-[#161824] border border-[#232636] rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8a8f98] text-sm font-medium">Messages Received</span>
                <MessageCircle className="w-5 h-5 text-[#62666d]" />
              </div>
              <p className="text-2xl font-bold text-[#f7f8f8]">{account.messageCount.received.toLocaleString()}</p>
              <p className="text-[#8a8f98] text-xs mt-1">Total received</p>
            </div>

            <div className="bg-[#161824] border border-[#232636] rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8a8f98] text-sm font-medium">Today</span>
                <Bell className="w-5 h-5 text-[#62666d]" />
              </div>
              <p className="text-2xl font-bold text-[#f7f8f8]">{account.messageCount.today}</p>
              <p className="text-[#8a8f98] text-xs mt-1">Messages today</p>
            </div>
          </div>

          {/* Settings Card */}
          <div className="bg-[#161824] border border-[#232636] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-[#f7f8f8] mb-4">Auto-Reply Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#f7f8f8]">Auto-Reply Enabled</p>
                  <p className="text-sm text-[#8a8f98]">Automatically reply to incoming messages</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <Input
                    type="checkbox"
                    checked={account.settings.autoReply}
                    onChange={(e) => setAccount(prev => prev ? {
                      ...prev,
                      settings: { ...prev.settings, autoReply: e.target.checked }
                    } : null)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/[0.12] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#5e6ad2]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#161824] after:border-[#232636] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {account.settings.autoReply && (
                <div>
                  <label className="block text-sm font-medium text-[#d0d6e0] mb-2">
                    Auto-Reply Message
                  </label>
                  <Textarea
                    value={account.settings.autoReplyMessage || ''}
                    onChange={(e) => setAccount(prev => prev ? {
                      ...prev,
                      settings: { ...prev.settings, autoReplyMessage: e.target.value }
                    } : null)}
                    rows={3}
                    className="w-full px-3 py-2 border border-[#232636] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your auto-reply message..."
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-[#232636]">
                <div>
                  <p className="font-medium text-[#f7f8f8]">Business Hours</p>
                  <p className="text-sm text-[#8a8f98]">
                    {account.settings.businessHours.start} - {account.settings.businessHours.end}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <Input
                    type="checkbox"
                    checked={account.settings.businessHours.enabled}
                    onChange={(e) => setAccount(prev => prev ? {
                      ...prev,
                      settings: {
                        ...prev.settings,
                        businessHours: { ...prev.settings.businessHours, enabled: e.target.checked }
                      }
                    } : null)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/[0.12] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#5e6ad2]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#161824] after:border-[#232636] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Disconnect Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleDisconnect}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-rose-500/10"
            >
              Disconnect WhatsApp
            </Button>
          </div>
        </>
      )}

      {/* Settings Modal */}
      <Modal
        open={showSettings && Boolean(account)}
        onClose={() => setShowSettings(false)}
        title="WhatsApp Settings"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowSettings(false);
                // Save settings
              }}
            >
              Save Settings
            </Button>
          </>
        }
      >
        {account ? (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#8a8f98]">
                Business Name
              </label>
              <Input
                type="text"
                value={account.businessName}
                onChange={(event) =>
                  setAccount((previous) =>
                    previous ? { ...previous, businessName: event.target.value } : null,
                  )
                }
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#8a8f98]">
                Phone Number
              </label>
              <Input type="text" value={account.phoneNumber} readOnly />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#8a8f98]">
                Away Message
              </label>
              <Textarea
                value={account.settings.awayMessage || ''}
                onChange={(event) =>
                  setAccount((previous) =>
                    previous
                      ? {
                          ...previous,
                          settings: { ...previous.settings, awayMessage: event.target.value },
                        }
                      : null,
                  )
                }
                rows={3}
                placeholder="Message to send when offline..."
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}


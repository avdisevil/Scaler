'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import {
  SearchIcon,
  XIcon,
  UserPlusIcon,
} from '@/components/ui/Icons';
import { User, Contact } from '@/types';
import { apiClient } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';

interface NewMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: (Contact & { contact_user?: User })[];
  onSelectContact: (contactUserId: number, displayName?: string) => void;
  onRefreshContacts?: () => Promise<void>;
}

export function NewMessageModal({
  isOpen,
  onClose,
  contacts,
  onSelectContact,
  onRefreshContacts,
}: NewMessageModalProps) {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [discoveredUsers, setDiscoveredUsers] = useState<User[]>([]);

  // Add Contact view/modal state
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [addContactUserId, setAddContactUserId] = useState('');
  const [addContactNickname, setAddContactNickname] = useState('');
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  const searchSeqRef = useRef(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced user search against backend
  const executeSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setDiscoveredUsers([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    const currentSeq = ++searchSeqRef.current;
    setIsSearching(true);
    setSearchError(null);

    try {
      // Backend searches by phone or display name
      const users: User[] = await apiClient.searchUsers(trimmed);
      if (currentSeq !== searchSeqRef.current) return; // Discard stale
      // Filter out current user from discovered list
      const filtered = users.filter((u) => u.id !== currentUser?.id);
      setDiscoveredUsers(filtered);
    } catch (err: any) {
      if (currentSeq !== searchSeqRef.current) return;
      setSearchError(err?.response?.data?.detail || 'Failed to search users');
    } finally {
      if (currentSeq === searchSeqRef.current) {
        setIsSearching(false);
      }
    }
  }, [currentUser?.id]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearch(query);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query.trim()) {
      setDiscoveredUsers([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(() => {
      executeSearch(query);
    }, 300);
  };

  const handleClearSearch = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSearch('');
    setDiscoveredUsers([]);
    setIsSearching(false);
    setSearchError(null);
  };

  // Filter existing contacts locally by search query
  const filteredContacts = contacts.filter((c) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const name = (c.display_name || c.contact_user?.display_name || '').toLowerCase();
    const phone = (c.contact_user?.phone || '').toLowerCase();
    return name.includes(q) || phone.includes(q);
  });

  // Discovered users who are NOT yet in contacts
  const existingContactUserIds = new Set(contacts.map((c) => c.contact_user_id));
  const nonContactDiscoveredUsers = discoveredUsers.filter(
    (u) => !existingContactUserIds.has(u.id)
  );

  const handleAddContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = parseInt(addContactUserId.trim(), 10);
    if (isNaN(targetId)) {
      showToast('Please enter a valid numeric User ID', 'error');
      return;
    }

    if (targetId === currentUser?.id) {
      showToast('Cannot add yourself as a contact', 'error');
      return;
    }

    setIsSubmittingContact(true);
    try {
      await apiClient.addContact(targetId, addContactNickname.trim() || undefined);
      showToast('Contact added successfully', 'success');
      setIsAddingContact(false);
      setAddContactUserId('');
      setAddContactNickname('');
      if (onRefreshContacts) {
        await onRefreshContacts();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to add contact';
      showToast(msg, 'error');
    } finally {
      setIsSubmittingContact(false);
    }
  };

  const handleQuickAddContact = async (userToAdd: User) => {
    try {
      await apiClient.addContact(userToAdd.id, userToAdd.display_name || undefined);
      showToast(`Added ${userToAdd.display_name || userToAdd.phone} to contacts`, 'success');
      if (onRefreshContacts) {
        await onRefreshContacts();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to add contact';
      showToast(msg, 'error');
    }
  };

  // Reset modal state on close
  useEffect(() => {
    if (!isOpen) {
      handleClearSearch();
      setIsAddingContact(false);
      setAddContactUserId('');
      setAddContactNickname('');
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col max-h-[85vh] select-none">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200/80">
          <h2 className="text-base font-bold text-gray-900">
            {isAddingContact ? 'Add New Contact' : 'New Message'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {isAddingContact ? (
          /* Add Contact Form */
          <form onSubmit={handleAddContactSubmit} className="p-5 space-y-4">
            <div>
              <label htmlFor="contact-user-id" className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                Contact User ID
              </label>
              <input
                id="contact-user-id"
                type="number"
                value={addContactUserId}
                onChange={(e) => setAddContactUserId(e.target.value)}
                placeholder="e.g. 2"
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-signal-blue focus:ring-2 focus:ring-signal-blue/20"
                autoFocus
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Enter the Signal User ID of the contact you wish to add.
              </p>
            </div>

            <div>
              <label htmlFor="contact-nickname" className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                Nickname / Display Name (Optional)
              </label>
              <input
                id="contact-nickname"
                type="text"
                value={addContactNickname}
                onChange={(e) => setAddContactNickname(e.target.value)}
                placeholder="e.g. Alice Cooper"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-signal-blue focus:ring-2 focus:ring-signal-blue/20"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingContact(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingContact}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-signal-blue hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmittingContact ? 'Adding...' : 'Save Contact'}
              </button>
            </div>
          </form>
        ) : (
          /* Search & Contacts View */
          <>
            {/* Search Input Bar */}
            <div className="px-5 py-3 border-b border-gray-100 bg-[#fafafa]">
              <div className="relative flex items-center">
                <SearchIcon className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={handleSearchChange}
                  placeholder="Find contacts or search Signal users"
                  className="w-full bg-white text-gray-900 text-sm pl-9 pr-8 py-1.5 rounded-lg border border-gray-200 focus:border-signal-blue/60 focus:ring-2 focus:ring-signal-blue/20 outline-none transition-all placeholder:text-gray-400"
                  autoFocus
                />
                {search && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2.5 p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Clear search"
                  >
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="p-2 border-b border-gray-100">
              <button
                type="button"
                onClick={() => setIsAddingContact(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 text-left transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-blue-50 text-signal-blue flex items-center justify-center shrink-0 group-hover:bg-signal-blue group-hover:text-white transition-colors">
                  <UserPlusIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Add New Contact</p>
                  <p className="text-xs text-gray-500">Add a contact to your personal address book</p>
                </div>
              </button>
            </div>

            {/* Contacts & Users List */}
            <div className="flex-1 overflow-y-auto p-2 min-h-[180px] max-h-[360px]">
              {/* SAVED CONTACTS */}
              <p className="text-[11px] font-semibold text-gray-400 px-3 py-1 uppercase tracking-wider">
                Contacts {contacts.length > 0 && `(${filteredContacts.length})`}
              </p>

              {filteredContacts.length === 0 ? (
                <div className="py-4 text-center text-gray-400 text-xs">
                  {search ? 'No saved contacts matching your search' : 'No contacts saved yet'}
                </div>
              ) : (
                filteredContacts.map((contact) => {
                  const name =
                    contact.display_name ||
                    contact.contact_user?.display_name ||
                    `User #${contact.contact_user_id}`;
                  const phone = contact.contact_user?.phone;

                  return (
                    <button
                      key={`contact-${contact.id}`}
                      type="button"
                      onClick={() => {
                        onSelectContact(contact.contact_user_id, name);
                        onClose();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 text-left transition-colors"
                    >
                      <Avatar
                        src={contact.contact_user?.avatar_url}
                        alt={name}
                        size="md"
                        isOnline={contact.contact_user?.is_online}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                        {phone && <p className="text-xs text-gray-500 truncate">{phone}</p>}
                      </div>
                    </button>
                  );
                })
              )}

              {/* SEARCH RESULTS: Other Signal Users */}
              {search.trim().length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-[11px] font-semibold text-gray-400 px-3 py-1 uppercase tracking-wider">
                    Other Signal Users
                  </p>

                  {isSearching ? (
                    <div className="py-4 text-center text-gray-400 text-xs">
                      Searching Signal directory...
                    </div>
                  ) : searchError ? (
                    <div className="py-4 text-center text-red-500 text-xs">
                      {searchError}
                    </div>
                  ) : nonContactDiscoveredUsers.length === 0 ? (
                    <div className="py-4 text-center text-gray-400 text-xs">
                      No additional users found
                    </div>
                  ) : (
                    nonContactDiscoveredUsers.map((discUser) => {
                      const name = discUser.display_name || discUser.phone;
                      return (
                        <div
                          key={`user-${discUser.id}`}
                          className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onSelectContact(discUser.id, name);
                              onClose();
                            }}
                            className="flex items-center gap-3 min-w-0 flex-1 text-left"
                          >
                            <Avatar
                              src={discUser.avatar_url}
                              alt={name}
                              size="md"
                              isOnline={discUser.is_online}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                              <p className="text-xs text-gray-500 truncate">{discUser.phone}</p>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleQuickAddContact(discUser)}
                            className="shrink-0 ml-2 px-2.5 py-1 text-xs font-medium text-signal-blue hover:bg-blue-50 border border-blue-200 rounded-md transition-colors"
                          >
                            + Add
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

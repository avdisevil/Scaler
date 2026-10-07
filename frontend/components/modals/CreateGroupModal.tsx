'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { XIcon, UserPlusIcon } from '@/components/ui/Icons';
import { Contact, User } from '@/types';
import { apiClient } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: (Contact & { contact_user?: User })[];
  onGroupCreated: (conversation: any) => void;
}

export function CreateGroupModal({
  isOpen,
  onClose,
  contacts,
  onGroupCreated,
}: CreateGroupModalProps) {
  const { showToast } = useToast();
  const [groupName, setGroupName] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set());
  const [isCreating, setIsCreating] = useState(false);

  const handleToggleContact = (contactUserId: number) => {
    setSelectedContacts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(contactUserId)) {
        newSet.delete(contactUserId);
      } else {
        newSet.add(contactUserId);
      }
      return newSet;
    });
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!groupName.trim()) {
      showToast('Please enter a group name', 'error');
      return;
    }

    if (selectedContacts.size === 0) {
      showToast('Please select at least one member', 'error');
      return;
    }

    setIsCreating(true);
    try {
      const participantIds = Array.from(selectedContacts);
      const group = await apiClient.createConversation(groupName.trim(), true, participantIds);
      showToast('Group created successfully', 'success');
      onGroupCreated(group);
      onClose();
      setGroupName('');
      setSelectedContacts(new Set());
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to create group';
      showToast(msg, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setGroupName('');
    setSelectedContacts(new Set());
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="flex flex-col max-h-[85vh] select-none">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200/80">
          <h2 className="text-base font-bold text-gray-900">New Group</h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreateGroup} className="flex-1 flex flex-col overflow-hidden">
          {/* Group Name Input */}
          <div className="px-5 py-4 border-b border-gray-100">
            <label htmlFor="group-name" className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Group Name
            </label>
            <input
              id="group-name"
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., Project Team"
              required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-signal-blue focus:ring-2 focus:ring-signal-blue/20"
              autoFocus
            />
          </div>

          {/* Members Selection */}
          <div className="flex-1 overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Members ({selectedContacts.size})
              </p>
            </div>

            {contacts.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-8">
                No contacts available. Add contacts first.
              </div>
            ) : (
              <div className="space-y-2">
                {contacts.map((contact) => {
                  const name =
                    contact.display_name ||
                    contact.contact_user?.display_name ||
                    `User #${contact.contact_user_id}`;
                  const isSelected = selectedContacts.has(contact.contact_user_id);

                  return (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => handleToggleContact(contact.contact_user_id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                        isSelected
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <Avatar
                        src={contact.contact_user?.avatar_url}
                        alt={name}
                        size="md"
                        isOnline={contact.contact_user?.is_online}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {contact.contact_user?.phone || ''}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-signal-blue text-white flex items-center justify-center">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-5 py-4 border-t border-gray-200/80 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !groupName.trim() || selectedContacts.size === 0}
              className="px-4 py-2 text-sm font-semibold text-white bg-signal-blue hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

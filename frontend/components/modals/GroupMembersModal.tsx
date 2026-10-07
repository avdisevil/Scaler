'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { XIcon, UserPlusIcon, TrashIcon } from '@/components/ui/Icons';
import { apiClient } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface Participant {
  id: number;
  user_id: number;
  role: 'admin' | 'member';
  user: {
    id: number;
    display_name?: string;
    phone: string;
    avatar_url?: string;
    is_online: boolean;
  };
}

interface GroupMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: number;
  participants: Participant[];
  currentUserId: number;
  isAdmin: boolean;
  onParticipantsChange: () => void;
}

export function GroupMembersModal({
  isOpen,
  onClose,
  conversationId,
  participants,
  currentUserId,
  isAdmin,
  onParticipantsChange,
}: GroupMembersModalProps) {
  const { showToast } = useToast();
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState<number | null>(null);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  const handleLoadContacts = async () => {
    setIsLoadingContacts(true);
    try {
      const data = await apiClient.getContacts();
      const memberIds = new Set(participants.map((p) => p.user_id));
      const availableContacts = data.filter((c: any) => !memberIds.has(c.contact_user_id));
      setContacts(availableContacts);
    } catch (err) {
      // Error handled silently - UI will show empty state
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContactId) return;

    setIsAdding(true);
    try {
      await apiClient.addParticipant(conversationId, selectedContactId);
      showToast('Member added successfully', 'success');
      setIsAddMemberOpen(false);
      setSelectedContactId(null);
      onParticipantsChange();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to add member';
      showToast(msg, 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (participantId: number, userId: number) => {
    if (!isAdmin) {
      showToast('Only admins can remove members', 'error');
      return;
    }

    setIsRemoving(userId);
    try {
      await apiClient.removeParticipant(conversationId, userId);
      showToast('Member removed successfully', 'success');
      onParticipantsChange();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to remove member';
      showToast(msg, 'error');
    } finally {
      setIsRemoving(null);
    }
  };

  const handleClose = () => {
    setIsAddMemberOpen(false);
    setSelectedContactId(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="flex flex-col max-h-[85vh] select-none">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200/80">
          <h2 className="text-base font-bold text-gray-900">Group Members</h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {isAddMemberOpen ? (
          <form onSubmit={handleAddMember} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <button
                type="button"
                onClick={() => setIsAddMemberOpen(false)}
                className="text-sm text-gray-600 hover:text-gray-900 mb-3"
              >
                ← Back to members
              </button>
              <p className="text-sm font-semibold text-gray-900">Add Member</p>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {contacts.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8">
                  No contacts available to add.
                </div>
              ) : (
                <div className="space-y-2">
                  {contacts.map((contact) => {
                    const name =
                      contact.display_name ||
                      contact.contact_user?.display_name ||
                      `User #${contact.contact_user_id}`;
                    const isSelected = selectedContactId === contact.contact_user_id;

                    return (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => setSelectedContactId(contact.contact_user_id)}
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

            <div className="px-5 py-4 border-t border-gray-200/80 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddMemberOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedContactId || isAdding}
                className="px-4 py-2 text-sm font-semibold text-white bg-signal-blue hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50"
              >
                {isAdding ? 'Adding...' : 'Add'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-2">
                {participants.map((participant) => {
                  const name = participant.user.display_name || participant.user.phone;
                  const isCurrentUser = participant.user_id === currentUserId;
                  const canRemove = isAdmin && !isCurrentUser;

                  return (
                    <div
                      key={participant.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50"
                    >
                      <Avatar
                        src={participant.user.avatar_url}
                        alt={name}
                        size="md"
                        isOnline={participant.user.is_online}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                          {participant.role === 'admin' && (
                            <span className="text-[10px] font-medium text-signal-blue bg-blue-50 px-1.5 py-0.5 rounded">
                              Admin
                            </span>
                          )}
                          {isCurrentUser && (
                            <span className="text-[10px] font-medium text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{participant.user.phone}</p>
                      </div>
                      {canRemove && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(participant.id, participant.user_id)}
                          disabled={isRemoving === participant.user_id}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Remove member"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {isAdmin && (
              <div className="px-5 py-4 border-t border-gray-200/80">
                <button
                  type="button"
                  onClick={() => {
                    handleLoadContacts();
                    setIsAddMemberOpen(true);
                  }}
                  disabled={isLoadingContacts}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-signal-blue hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  <UserPlusIcon className="w-4 h-4" />
                  <span>{isLoadingContacts ? 'Loading...' : 'Add Member'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

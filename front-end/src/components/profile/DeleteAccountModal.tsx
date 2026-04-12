import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileAPI } from '../../services/api';
import { useAuth } from '../../contexts/useAuth';
import { getErrorMessage } from '../../utils/error';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ isOpen, onClose }) => {
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const { logout } = useAuth();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleDelete = async () => {
    if (deleteConfirmText.toLowerCase() !== 'delete') return;

    setIsDeleting(true);
    setError('');
    try {
      const response = await profileAPI.deleteProfile();
      if (response.success) {
        await logout();
        navigate('/');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to delete account'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setDeleteConfirmText('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-kin-xl shadow-kin-strong max-w-md w-full p-6">
        <h2 className="text-xl font-bold font-montserrat text-kin-navy mb-2">Delete Account</h2>
        <p className="text-kin-navy font-inter mb-4">
          This action cannot be undone. All your data, connections, and messages will be permanently deleted.
        </p>
        <p className="text-kin-navy font-inter mb-2">
          Type <strong>delete</strong> to confirm:
        </p>
        <input
          type="text"
          value={deleteConfirmText}
          onChange={(e) => setDeleteConfirmText(e.target.value)}
          placeholder="delete"
          className="w-full px-4 py-3 border border-kin-stone-300 rounded-kin-sm font-inter mb-4 focus:ring-2 focus:ring-kin-coral focus:border-transparent outline-none"
          aria-label="Type delete to confirm"
        />
        {error && (
          <div className="bg-kin-coral-50 border border-kin-coral-200 text-kin-coral-700 px-4 py-2 rounded-kin font-inter mb-4">
            {error}
          </div>
        )}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="flex-1 bg-kin-stone-200 text-kin-navy py-3 rounded-kin-sm font-semibold font-montserrat hover:bg-kin-stone-300 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting || deleteConfirmText.toLowerCase() !== 'delete'}
            className="flex-1 bg-kin-coral-700 text-white py-3 rounded-kin-sm font-semibold font-montserrat hover:bg-kin-coral-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteAccountModal;

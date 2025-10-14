import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-toastify';
import './WhitelistManager.css';

const WhitelistManager = () => {
  const [emails, setEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadWhitelist();
  }, []);

  const loadWhitelist = async () => {
    try {
      const whitelistDoc = await getDoc(doc(db, 'settings', 'whitelist'));
      if (whitelistDoc.exists()) {
        setEmails(whitelistDoc.data().emails || []);
      }
    } catch (error) {
      console.error('Error loading whitelist:', error);
      toast.error('Failed to load whitelist');
    } finally {
      setLoading(false);
    }
  };

  const saveWhitelist = async (updatedEmails) => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'whitelist'), {
        emails: updatedEmails,
        updatedAt: new Date()
      });
      setEmails(updatedEmails);
      toast.success('Whitelist updated');
    } catch (error) {
      console.error('Error saving whitelist:', error);
      toast.error('Failed to save whitelist');
    } finally {
      setSaving(false);
    }
  };

  const handleAddEmail = () => {
    const trimmedEmail = newEmail.trim().toLowerCase();

    if (!trimmedEmail) {
      toast.warning('Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (emails.includes(trimmedEmail)) {
      toast.warning('Email already in whitelist');
      return;
    }

    const updatedEmails = [...emails, trimmedEmail];
    saveWhitelist(updatedEmails);
    setNewEmail('');
  };

  const handleRemoveEmail = (emailToRemove) => {
    if (emails.length === 1) {
      toast.error('Cannot remove last email. At least one admin must remain.');
      return;
    }

    if (window.confirm(`Remove ${emailToRemove} from whitelist?`)) {
      const updatedEmails = emails.filter(e => e !== emailToRemove);
      saveWhitelist(updatedEmails);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddEmail();
    }
  };

  if (loading) {
    return (
      <div className="whitelist-manager">
        <div className="loading-text">Loading whitelist...</div>
      </div>
    );
  }

  return (
    <div className="whitelist-manager">
      <div className="whitelist-header">
        <h2>Authorized Users</h2>
        <p>Manage who can access SoSTrack. Only emails in this list can sign in with Google.</p>
      </div>

      <div className="add-email-section">
        <input
          type="email"
          placeholder="Enter email address..."
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          onKeyPress={handleKeyPress}
          className="email-input"
          disabled={saving}
        />
        <button
          onClick={handleAddEmail}
          disabled={saving}
          className="add-email-btn"
        >
          {saving ? 'Adding...' : 'Add Email'}
        </button>
      </div>

      <div className="emails-list">
        <h3>Authorized Emails ({emails.length})</h3>
        {emails.length === 0 ? (
          <div className="empty-state">
            No emails in whitelist. Add at least one to enable access.
          </div>
        ) : (
          <div className="email-cards">
            {emails.map((email, index) => (
              <div key={index} className="email-card">
                <div className="email-info">
                  <span className="email-icon">👤</span>
                  <span className="email-address">{email}</span>
                </div>
                <button
                  onClick={() => handleRemoveEmail(email)}
                  disabled={saving}
                  className="remove-email-btn"
                  title="Remove email"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="whitelist-info">
        <h3>ℹ️ How it works</h3>
        <ul>
          <li>Only Google accounts with these email addresses can sign in</li>
          <li>Changes take effect immediately</li>
          <li>Users already signed in will stay signed in until they log out</li>
          <li>You cannot remove the last email (at least one admin must remain)</li>
        </ul>
      </div>
    </div>
  );
};

export default WhitelistManager;

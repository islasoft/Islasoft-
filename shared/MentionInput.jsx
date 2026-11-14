import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';

export default function MentionInput({ 
  value, 
  onChange, 
  onMention,
  users = [],
  placeholder = "Type @ to mention someone...",
  className = "",
  rows = 3
}) {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionPosition, setMentionPosition] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef(null);

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(mentionSearch.toLowerCase()) ||
    user.email?.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const handleInputChange = (e) => {
    const text = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    onChange(text);

    // Check if @ was typed
    const beforeCursor = text.slice(0, cursorPosition);
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const afterAt = beforeCursor.slice(lastAtIndex + 1);
      if (!/\s/.test(afterAt)) {
        setMentionSearch(afterAt);
        setMentionPosition(lastAtIndex);
        setShowMentions(true);
        setSelectedIndex(0);
        return;
      }
    }
    
    setShowMentions(false);
  };

  const insertMention = (user) => {
    const beforeMention = value.slice(0, mentionPosition);
    const afterMention = value.slice(mentionPosition + mentionSearch.length + 1);
    const newValue = `${beforeMention}@${user.full_name} ${afterMention}`;
    
    onChange(newValue);
    setShowMentions(false);
    setMentionSearch('');
    
    if (onMention) {
      onMention(user);
    }
    
    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (!showMentions || filteredUsers.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => 
        prev < filteredUsers.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => 
        prev > 0 ? prev - 1 : filteredUsers.length - 1
      );
    } else if (e.key === 'Enter' && showMentions) {
      e.preventDefault();
      insertMention(filteredUsers[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowMentions(false);
    }
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        rows={rows}
      />
      
      {showMentions && filteredUsers.length > 0 && (
        <div className="absolute z-50 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
          {filteredUsers.map((user, index) => (
            <button
              key={user.id}
              type="button"
              onClick={() => insertMention(user)}
              className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
            >
              <div className="font-medium text-sm">{user.full_name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
import React, { useState, useRef, useEffect } from 'react';

const SearchableSelect = ({
  value,
  onChange,
  options = [],
  placeholder = 'اختر...',
  searchPlaceholder = 'ابحث...',
  getOptionLabel = (opt) => opt.label || opt.name || opt.title || String(opt),
  getOptionValue = (opt) => opt.value || opt.id || String(opt),
  required = false,
  disabled = false,
  className = '',
  style = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selectedOption = options.find(opt => String(getOptionValue(opt)) === String(value));

  const filteredOptions = options.filter(opt => {
    const label = getOptionLabel(opt).toLowerCase();
    return label.includes(searchTerm.toLowerCase());
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (option) => {
    const optionValue = getOptionValue(option);
    onChange({ target: { value: String(optionValue) } });
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchTerm('');
      }
    }
  };

  return (
    <div 
      ref={containerRef} 
      className={`searchable-select ${className} ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
      style={style}
    >
      <div 
        className="searchable-select-trigger"
        onClick={handleToggle}
      >
        <span className={selectedOption ? 'selected-value' : 'placeholder'}>
          {selectedOption ? getOptionLabel(selectedOption) : placeholder}
        </span>
        <span className="searchable-select-arrow">▼</span>
      </div>
      
      {isOpen && (
        <div className="searchable-select-dropdown">
          <div className="searchable-select-search">
            <input
              ref={inputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="searchable-select-input"
            />
          </div>
          <div className="searchable-select-options">
            {filteredOptions.length === 0 ? (
              <div className="searchable-select-no-results">لا توجد نتائج</div>
            ) : (
              filteredOptions.map((option, index) => {
                const optionValue = getOptionValue(option);
                const optionLabel = getOptionLabel(option);
                const isSelected = String(optionValue) === String(value);
                return (
                  <div
                    key={index}
                    className={`searchable-select-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(option)}
                  >
                    {optionLabel}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
      
      {required && !value && (
        <input
          type="text"
          required
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
          tabIndex={-1}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default SearchableSelect;

import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { gemoji } from "gemoji";
import { EMOJI_PRESETS } from "../editor/constants/emojiPresets";

interface EmojiButtonProps {
  emoji: string;
  name: string;
  globalIdx: number;
  isSelected: boolean;
}

const EmojiButton = memo(function EmojiButton({
  emoji,
  name,
  globalIdx,
  isSelected,
}: EmojiButtonProps) {
  return (
    <button
      type="button"
      className={`emoji-picker__emoji-btn${isSelected ? " is-selected" : ""}`}
      title={`:${name}:`}
      data-index={globalIdx}
    >
      {emoji}
    </button>
  );
});

// Define the skin tone modifiers
const skinToneModifiers = ["", "🏻", "🏼", "🏽", "🏾", "🏿"];
const skinToneLabels = ["Default (Yellow)", "Light", "Medium-Light", "Medium", "Medium-Dark", "Dark"];

const NON_SKIN_TONE_PEOPLE_EMOJIS = new Set([
  "👥", "👤", "🫂", "🗣️", "👣", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👄", "👅", "🩸", "💩", "💀", "☠️", "👽", "👾", "🤖", "👻"
]);

function canApplySkinTone(emoji: string, category: string, description: string): boolean {
  if (category === "People & Body") {
    return !NON_SKIN_TONE_PEOPLE_EMOJIS.has(emoji);
  }
  
  if (category === "Activities") {
    const desc = description.toLowerCase();
    const keywords = [
      "person", "man", "woman", "athlete", "dancer", "runner", "player", "worker",
      "climb", "row", "swim", "surf", "golf", "bike", "cartwheel", "wrestle",
      "handball", "juggling", "yoga"
    ];
    return keywords.some(keyword => desc.includes(keyword));
  }
  
  return false;
}

function applySkinTone(emoji: string, toneIndex: number): string {
  const modifier = skinToneModifiers[toneIndex];
  if (!modifier) return emoji;
  
  const segments = emoji.split("\u200D");
  segments[0] = segments[0] + modifier;
  return segments.join("\u200D");
}

interface EmojiItem {
  emoji: string;
  baseEmoji: string;
  name: string;
  description: string;
  category: string;
  supportsSkinTone: boolean;
}

interface CategoryGroup {
  id: string;
  label: string;
  icon: string;
  emojis: EmojiItem[];
}

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
  initialSearch?: string;
}

export function EmojiPicker({ onSelectEmoji, onClose, initialSearch = "" }: EmojiPickerProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [skinTone, setSkinTone] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("md-emoji-skin-tone");
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [skinToneMenuEmoji, setSkinToneMenuEmoji] = useState<EmojiItem | null>(null);
  const [skinToneMenuPosition, setSkinToneMenuPosition] = useState<{ top: number; left: number } | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const categoryHeadersRef = useRef<(HTMLDivElement | null)[]>([]);
  const itemsContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const lastScrollTimeRef = useRef<number>(0);
  const scrollTimeoutRef = useRef<number | null>(null);
  const lastSelectedIndexRef = useRef<number>(0);
  const hoveredIndexRef = useRef<number | null>(null);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const previewCharRef = useRef<HTMLSpanElement>(null);
  const previewNameRef = useRef<HTMLSpanElement>(null);
  const previewDescRef = useRef<HTMLSpanElement>(null);

  const updatePreviewFooter = useCallback((item: EmojiItem | null) => {
    if (!previewContainerRef.current) return;
    if (item) {
      if (previewCharRef.current) previewCharRef.current.textContent = item.emoji;
      if (previewNameRef.current) previewNameRef.current.textContent = `:${item.name}:`;
      if (previewDescRef.current) previewDescRef.current.textContent = item.description;
      previewContainerRef.current.classList.remove("is-empty");
    } else {
      if (previewCharRef.current) previewCharRef.current.textContent = "";
      if (previewNameRef.current) previewNameRef.current.textContent = "";
      if (previewDescRef.current) previewDescRef.current.textContent = "";
      previewContainerRef.current.classList.add("is-empty");
    }
  }, []);

  // Load frequently used emojis from local storage
  const [frequentEmojis, setFrequentEmojis] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("md-frequent-emojis");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return EMOJI_PRESETS.map(p => p.emoji);
  });

  // Save selection and update frequently used
  const handleEmojiClick = useCallback((item: EmojiItem) => {
    const chosenEmoji = item.supportsSkinTone ? applySkinTone(item.baseEmoji, skinTone) : item.emoji;
    onSelectEmoji(chosenEmoji);
    
    // Add to frequently used list
    setFrequentEmojis(prev => {
      const filtered = prev.filter(e => e !== item.baseEmoji);
      const updated = [item.baseEmoji, ...filtered].slice(0, 16);
      try {
        localStorage.setItem("md-frequent-emojis", JSON.stringify(updated));
      } catch {}
      return updated;
    });
    
    onClose();
  }, [skinTone, onSelectEmoji, onClose]);

  // Handle skin tone change
  const handleSelectSkinTone = useCallback((toneIndex: number) => {
    setSkinTone(toneIndex);
    try {
      localStorage.setItem("md-emoji-skin-tone", toneIndex.toString());
    } catch {}
    setSkinToneMenuEmoji(null);
    setSkinToneMenuPosition(null);
  }, []);

  // Process and categorize all emojis
  const categories = useMemo<CategoryGroup[]>(() => {
    const categoryMapping: Record<string, { label: string; icon: string }> = {
      "frequent": { label: "Frequently Used", icon: "history" },
      "Smileys & People": { label: "Smileys & People", icon: "mood" },
      "Animals & Nature": { label: "Animals & Nature", icon: "pets" },
      "Food & Drink": { label: "Food & Drink", icon: "lunch_dining" },
      "Travel & Places": { label: "Travel & Places", icon: "directions_bus" },
      "Activities": { label: "Activities", icon: "sports_soccer" },
      "Objects": { label: "Objects", icon: "lightbulb" },
      "Symbols": { label: "Symbols", icon: "category" },
      "Flags": { label: "Flags", icon: "flag" }
    };

    const makeEmojiItem = (emoji: string, gemojiEntry?: typeof gemoji[0]): EmojiItem => {
      const entry = gemojiEntry || gemoji.find(g => g.emoji === emoji);
      const category = entry?.category || "Objects";
      const description = entry?.description || "";
      const name = entry?.names[0] || description;
      const supportsSkin = entry ? canApplySkinTone(emoji, category, description) : false;

      return {
        emoji: supportsSkin ? applySkinTone(emoji, skinTone) : emoji,
        baseEmoji: emoji,
        name,
        description,
        category,
        supportsSkinTone: supportsSkin
      };
    };

    const groups: Record<string, EmojiItem[]> = {
      "frequent": frequentEmojis.map(emoji => makeEmojiItem(emoji)),
      "Smileys & People": [],
      "Animals & Nature": [],
      "Food & Drink": [],
      "Travel & Places": [],
      "Activities": [],
      "Objects": [],
      "Symbols": [],
      "Flags": []
    };

    gemoji.forEach(entry => {
      let targetCat = entry.category;
      if (targetCat === "Smileys & Emotion" || targetCat === "People & Body") {
        targetCat = "Smileys & People";
      }

      if (groups[targetCat]) {
        groups[targetCat].push(makeEmojiItem(entry.emoji, entry));
      }
    });

    return Object.entries(categoryMapping)
      .map(([id, config]) => ({
        id,
        label: config.label,
        icon: config.icon,
        emojis: groups[id] || []
      }))
      .filter(g => g.emojis.length > 0);
  }, [skinTone, frequentEmojis]);

  // Flat list of filtered emojis based on search query
  const flatFilteredEmojis = useMemo<EmojiItem[]>(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      // If empty query, flat list contains all emojis to keep selectedIndex in sync
      return categories.flatMap(c => c.emojis);
    }

    const filtered = gemoji.filter(entry => {
      return (
        entry.names.some(name => name.toLowerCase().includes(query)) ||
        entry.tags.some(tag => tag.toLowerCase().includes(query)) ||
        entry.description.toLowerCase().includes(query)
      );
    });

    // Limit search results to 200 matches to keep render fast
    return filtered.slice(0, 200).map(entry => {
      const supportsSkin = canApplySkinTone(entry.emoji, entry.category, entry.description);
      return {
        emoji: supportsSkin ? applySkinTone(entry.emoji, skinTone) : entry.emoji,
        baseEmoji: entry.emoji,
        name: entry.names[0] || entry.description,
        description: entry.description,
        category: entry.category,
        supportsSkinTone: supportsSkin
      };
    });
  }, [searchQuery, categories, skinTone]);

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Sync scroll indicator
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    
    if (searchQuery.trim() !== "") return;

    const now = Date.now();
    if (now - lastScrollTimeRef.current < 100) {
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = window.setTimeout(() => {
        if (!scrollContainerRef.current) return;
        const c = scrollContainerRef.current;
        const cRect = c.getBoundingClientRect();
        let actIdx = 0;
        let minD = Infinity;
        categoryHeadersRef.current.forEach((hEl, idx) => {
          if (!hEl) return;
          const r = hEl.getBoundingClientRect();
          const dist = Math.abs(r.top - cRect.top);
          if (dist < minD) {
            minD = dist;
            actIdx = idx;
          }
        });
        setActiveCategoryIndex(actIdx);
      }, 100);
      return;
    }

    lastScrollTimeRef.current = now;
    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }

    const containerRect = container.getBoundingClientRect();
    let activeIndex = 0;
    let minDistance = Infinity;

    categoryHeadersRef.current.forEach((headerEl, index) => {
      if (!headerEl) return;
      const rect = headerEl.getBoundingClientRect();
      const distance = Math.abs(rect.top - containerRect.top);
      if (distance < minDistance) {
        minDistance = distance;
        activeIndex = index;
      }
    });

    setActiveCategoryIndex(activeIndex);
  }, [searchQuery]);

  // Smooth scroll to category
  const handleCategoryClick = useCallback((index: number) => {
    setActiveCategoryIndex(index);

    // Sync keyboard selection to the first emoji of the clicked category
    let globalIndexOffset = 0;
    for (let i = 0; i < index; i++) {
      globalIndexOffset += categories[i].emojis.length;
    }
    setSelectedIndex(globalIndexOffset);
    lastSelectedIndexRef.current = globalIndexOffset;

    if (searchQuery.trim() !== "") {
      setSearchQuery("");
      // Give state time to reset query and render all categories, then scroll
      setTimeout(() => {
        const headerEl = categoryHeadersRef.current[index];
        if (headerEl && scrollContainerRef.current) {
          headerEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 50);
      return;
    }

    setTimeout(() => {
      const headerEl = categoryHeadersRef.current[index];
      if (headerEl && scrollContainerRef.current) {
        headerEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 20);
  }, [searchQuery, categories]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const itemsCount = flatFilteredEmojis.length;
      if (itemsCount === 0) return;

      const columns = 8; // Number of columns in our CSS grid
      const baseIndex = hoveredIndexRef.current !== null ? hoveredIndexRef.current : selectedIndex;

      if (event.key === "ArrowRight") {
        event.preventDefault();
        const nextIdx = Math.min(itemsCount - 1, baseIndex + 1);
        hoveredIndexRef.current = null;
        setSelectedIndex(nextIdx);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        const nextIdx = Math.max(0, baseIndex - 1);
        hoveredIndexRef.current = null;
        setSelectedIndex(nextIdx);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        const nextIdx = Math.min(itemsCount - 1, baseIndex + columns);
        hoveredIndexRef.current = null;
        setSelectedIndex(nextIdx);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        const nextIdx = Math.max(0, baseIndex - columns);
        hoveredIndexRef.current = null;
        setSelectedIndex(nextIdx);
      } else if (event.key === "Enter") {
        event.preventDefault();
        const targetIdx = hoveredIndexRef.current !== null ? hoveredIndexRef.current : selectedIndex;
        if (flatFilteredEmojis[targetIdx]) {
          handleEmojiClick(flatFilteredEmojis[targetIdx]);
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [flatFilteredEmojis, selectedIndex, handleEmojiClick, onClose]);

  // Scroll active keyboard item into view
  useEffect(() => {
    const activeEl = itemsContainerRef.current?.querySelector(".is-selected");
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
    // Set hovered emoji to selected index for preview
    updatePreviewFooter(flatFilteredEmojis[selectedIndex] || null);
  }, [selectedIndex, flatFilteredEmojis, updatePreviewFooter]);

  // Update activeCategoryIndex when selectedIndex changes (e.g. via keyboard navigation)
  useEffect(() => {
    if (searchQuery.trim() !== "") return;
    
    if (selectedIndex === lastSelectedIndexRef.current) {
      return;
    }
    lastSelectedIndexRef.current = selectedIndex;

    // Find which category the selectedIndex belongs to
    let accumulatedCount = 0;
    for (let i = 0; i < categories.length; i++) {
      accumulatedCount += categories[i].emojis.length;
      if (selectedIndex < accumulatedCount) {
        if (activeCategoryIndex !== i) {
          setActiveCategoryIndex(i);
        }
        break;
      }
    }
  }, [selectedIndex, categories, searchQuery, activeCategoryIndex]);

  // Event Delegation mouse handlers for better performance
  const handleMouseOverGrid = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const btn = target.closest(".emoji-picker__emoji-btn");
    if (btn) {
      const indexStr = btn.getAttribute("data-index");
      if (indexStr) {
        const idx = parseInt(indexStr, 10);
        if (hoveredIndexRef.current === idx) return;
        hoveredIndexRef.current = idx;
        
        const item = flatFilteredEmojis[idx];
        if (item) {
          updatePreviewFooter(item);
        }
      }
    }
  }, [flatFilteredEmojis, updatePreviewFooter]);

  const handleMouseDownGrid = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left clicks
    const target = e.target as HTMLElement;
    const btn = target.closest(".emoji-picker__emoji-btn");
    if (btn) {
      const indexStr = btn.getAttribute("data-index");
      if (indexStr) {
        const idx = parseInt(indexStr, 10);
        const item = flatFilteredEmojis[idx];
        if (item && item.supportsSkinTone) {
          const clientX = e.clientX;
          const clientY = e.clientY;
          longPressTimerRef.current = window.setTimeout(() => {
            setSkinToneMenuEmoji(item);
            setSkinToneMenuPosition({
              top: clientY - 50,
              left: Math.max(10, Math.min(window.innerWidth - 250, clientX - 80))
            });
            longPressTimerRef.current = null;
          }, 500);
        }
      }
    }
  }, [flatFilteredEmojis]);

  const handleMouseUpGrid = useCallback((e: React.MouseEvent) => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    const btn = target.closest(".emoji-picker__emoji-btn");
    if (btn) {
      const indexStr = btn.getAttribute("data-index");
      if (indexStr) {
        const idx = parseInt(indexStr, 10);
        const item = flatFilteredEmojis[idx];
        if (item && !skinToneMenuEmoji) {
          handleEmojiClick(item);
        }
      }
    }
  }, [flatFilteredEmojis, skinToneMenuEmoji, handleEmojiClick]);

  const handleMouseLeaveGrid = useCallback(() => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    hoveredIndexRef.current = null;
    updatePreviewFooter(flatFilteredEmojis[selectedIndex] || null);
  }, [flatFilteredEmojis, selectedIndex, updatePreviewFooter]);

  const handleTouchStartGrid = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    const btn = target.closest(".emoji-picker__emoji-btn");
    if (btn) {
      const indexStr = btn.getAttribute("data-index");
      if (indexStr) {
        const idx = parseInt(indexStr, 10);
        const item = flatFilteredEmojis[idx];
        if (item && item.supportsSkinTone) {
          const touch = e.touches[0];
          const clientX = touch.clientX;
          const clientY = touch.clientY;
          longPressTimerRef.current = window.setTimeout(() => {
            setSkinToneMenuEmoji(item);
            setSkinToneMenuPosition({
              top: clientY - 50,
              left: Math.max(10, Math.min(window.innerWidth - 250, clientX - 80))
            });
            longPressTimerRef.current = null;
          }, 500);
        }
      }
    }
  }, [flatFilteredEmojis]);

  const handleTouchEndGrid = useCallback((e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    const target = e.target as HTMLElement;
    const btn = target.closest(".emoji-picker__emoji-btn");
    if (btn) {
      const indexStr = btn.getAttribute("data-index");
      if (indexStr) {
        const idx = parseInt(indexStr, 10);
        const item = flatFilteredEmojis[idx];
        if (item && !skinToneMenuEmoji) {
          handleEmojiClick(item);
        }
      }
    }
  }, [flatFilteredEmojis, skinToneMenuEmoji, handleEmojiClick]);

  const handleContextMenuGrid = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const btn = target.closest(".emoji-picker__emoji-btn");
    if (btn) {
      const indexStr = btn.getAttribute("data-index");
      if (indexStr) {
        const idx = parseInt(indexStr, 10);
        const item = flatFilteredEmojis[idx];
        if (item && item.supportsSkinTone) {
          const rect = btn.getBoundingClientRect();
          setSkinToneMenuEmoji(item);
          setSkinToneMenuPosition({
            top: rect.top - 50,
            left: Math.max(10, Math.min(window.innerWidth - 250, rect.left - 80))
          });
        }
      }
    }
  }, [flatFilteredEmojis]);

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
      }
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="emoji-picker" onClick={(e) => e.stopPropagation()}>
      {/* Top Search bar */}
      <div className="emoji-picker__search-row">
        <span className="material-symbols-outlined emoji-picker__search-icon">search</span>
        <input
          ref={searchInputRef}
          type="text"
          className="emoji-picker__search-input"
          placeholder="Search Emojis..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Category Icons Row */}
      {searchQuery.trim() === "" && (
        <div className="emoji-picker__category-bar">
          {categories.map((cat, idx) => (
            <button
              key={cat.id}
              type="button"
              className={`emoji-picker__category-btn${idx === activeCategoryIndex ? " is-active" : ""}`}
              title={cat.label}
              onClick={() => handleCategoryClick(idx)}
            >
              <span className="material-symbols-outlined">{cat.icon}</span>
            </button>
          ))}
        </div>
      )}

      {/* Scrollable Emojis Container with Event Delegation */}
      <div
        ref={scrollContainerRef}
        className="emoji-picker__scroll-container"
        onScroll={handleScroll}
        onMouseOver={handleMouseOverGrid}
        onMouseDown={handleMouseDownGrid}
        onMouseUp={handleMouseUpGrid}
        onMouseLeave={handleMouseLeaveGrid}
        onTouchStart={handleTouchStartGrid}
        onTouchEnd={handleTouchEndGrid}
        onContextMenu={handleContextMenuGrid}
      >
        <div ref={itemsContainerRef}>
          {searchQuery.trim() === "" ? (
            categories.map((cat, catIdx) => {
              // Calculate global index offset for this category
              let globalIndexOffset = 0;
              for (let i = 0; i < catIdx; i++) {
                globalIndexOffset += categories[i].emojis.length;
              }

              const isRendered = Math.abs(catIdx - activeCategoryIndex) <= 1;
              const rowsCount = Math.ceil(cat.emojis.length / 8);
              const gridHeight = rowsCount > 0 ? rowsCount * 34 + (rowsCount - 1) * 2.4 : 0;

              return (
                <div key={cat.id} className="emoji-picker__category-section">
                  <div
                    ref={(el) => { categoryHeadersRef.current[catIdx] = el; }}
                    className="emoji-picker__category-title"
                  >
                    {cat.label}
                  </div>
                  {isRendered ? (
                    <div className="emoji-picker__grid">
                      {cat.emojis.map((item, itemIdx) => {
                        const globalIdx = globalIndexOffset + itemIdx;
                        const isSelected = globalIdx === selectedIndex;
                        return (
                          <EmojiButton
                            key={`${cat.id}-${item.baseEmoji}`}
                            emoji={item.emoji}
                            name={item.name}
                            globalIdx={globalIdx}
                            isSelected={isSelected}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ height: `${gridHeight}px` }} />
                  )}
                </div>
              );
            })
          ) : flatFilteredEmojis.length > 0 ? (
            <div className="emoji-picker__category-section">
              <div className="emoji-picker__category-title">Search Results</div>
              <div className="emoji-picker__grid">
                {flatFilteredEmojis.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <EmojiButton
                      key={`search-${item.baseEmoji}`}
                      emoji={item.emoji}
                      name={item.name}
                      globalIdx={idx}
                      isSelected={isSelected}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="emoji-picker__no-results">No matching emojis found</div>
          )}
        </div>
      </div>

      {/* Hover-only Preview Footer */}
      <div className="emoji-picker__footer">
        <div
          ref={previewContainerRef}
          className="emoji-picker__preview is-empty"
        >
          <span ref={previewCharRef} className="emoji-picker__preview-character" />
          <div className="emoji-picker__preview-details">
            <span ref={previewNameRef} className="emoji-picker__preview-shortcode" />
            <span ref={previewDescRef} className="emoji-picker__preview-desc" />
          </div>
        </div>
      </div>

      {/* Floating Skin Tone Context Menu */}
      {skinToneMenuEmoji && skinToneMenuPosition && (
        <>
          <div
            className="emoji-picker__skin-tone-overlay"
            onClick={() => {
              setSkinToneMenuEmoji(null);
              setSkinToneMenuPosition(null);
            }}
          />
          <div
            className="emoji-picker__skin-tone-menu"
            style={{
              top: `${skinToneMenuPosition.top}px`,
              left: `${skinToneMenuPosition.left}px`
            }}
          >
            {skinToneModifiers.map((_, idx) => {
              const base = skinToneMenuEmoji.baseEmoji;
              const preview = applySkinTone(base, idx);
              return (
                <button
                  key={idx}
                  type="button"
                  className={`emoji-picker__skin-tone-option${idx === skinTone ? " is-active" : ""}`}
                  title={skinToneLabels[idx]}
                  onClick={() => handleSelectSkinTone(idx)}
                >
                  {preview}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

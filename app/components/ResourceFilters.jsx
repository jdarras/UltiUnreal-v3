// app/components/ResourceFilters.jsx
export default function ResourceFilters({
  query,
  onQueryChange,
  canClearSearch,
  onClearSearch,
  searchExpanded,
  onOpenAdvanced,
  onCloseAdvanced,
  searchAdvanced,
  setSearchAdvanced,
  quickFilters,
  setQuickFilters,
  usageOptions,
  styleOptions,
  ambianceOptions,
  licenseOptions,
  sellerOptions,
  typeOptions,
  distributionOptions,
  ueOptions,
  filteredCount,
  ratingValues,
  t,
}) {
  return (
    <>
      <div className="uu-section">
        <div className="uu-row uu-align-center uu-gap-8" style={{ flexWrap: 'nowrap', alignItems: 'center' }}>
          <div className="uu-row uu-gap-4 uu-align-center" style={{ flex: '0 0 auto' }}>
            <input
              className="uu-input"
              style={{ width: '280px', maxWidth: '320px', height: '36px', lineHeight: '36px' }}
              placeholder={t('resources.searchPlaceholder') || 'Search'}
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
            />
            <button
              type="button"
              className="uu-btn uu-btn-icon"
              onClick={onClearSearch}
              disabled={!canClearSearch}
              title={t('resources.search.clear') || 'Clear'}
              style={{ width: '36px', minWidth: '36px', height: '36px', padding: '0 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ✕
            </button>
            <button
              type="button"
              className="uu-btn"
              onClick={onOpenAdvanced}
              style={{ height: '36px', minHeight: '36px', display: 'flex', alignItems: 'center' }}
            >
              {t('resources.search.advancedButton') || 'Advanced'}
            </button>
          </div>

          <div className="uu-row uu-align-center" style={{ flex: '0 0 auto', marginLeft: '12px', gap: '32px' }}>
            <label className="uu-check">
              <input
                type="checkbox"
                checked={!!quickFilters.tested}
                onChange={() => setQuickFilters((prev) => ({ ...prev, tested: !prev.tested }))}
              />
              {t('resources.detail.labels.tested') || 'Testé'}
            </label>
            <div className="uu-row uu-gap-6 uu-align-center">
              <button
                type="button"
                className={`uu-fav-filter ${quickFilters.favorite ? 'active' : ''}`}
                onClick={() => setQuickFilters((prev) => ({ ...prev, favorite: !prev.favorite }))}
                aria-pressed={quickFilters.favorite ? 'true' : 'false'}
                title={t('resources.detail.labels.favorite') || 'Favoris'}
              >
                ★
              </button>
              <span>{t('resources.detail.labels.favorite') || 'Favoris'}</span>
            </div>
          </div>
        </div>
      </div>

      {searchExpanded ? (
        <div className="uu-section">
          <div className="uu-card uu-col uu-gap-12">
            <div className="uu-row uu-align-center uu-gap-8 uu-wrap">
              <strong className="uu-block-title">{t('resources.search.advancedTitle') || 'Advanced search'}</strong>
              <div className="uu-muted">
                {filteredCount ? `(${filteredCount} ${t('resources.search.resultsLabel') || 'results'})` : ''}
              </div>
            </div>

            <div className="uu-col uu-gap-12">
              <div className="uu-row uu-gap-16 uu-wrap">
                <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                  <label className="uu-label" style={{ width: '90px' }}>{t('resources.detail.labels.usage') || 'Usage'}</label>
                  <select
                    className="uu-select"
                    style={{ flex: '1 1 220px', minWidth: '200px', height: '36px' }}
                    value={searchAdvanced.usage}
                    onChange={(e) => setSearchAdvanced((prev) => ({ ...prev, usage: e.target.value }))}
                  >
                    <option value="">{t('common.none')}</option>
                    {usageOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                  <label className="uu-label" style={{ width: '90px' }}>{t('resources.detail.labels.style') || 'Style'}</label>
                  <select
                    className="uu-select"
                    style={{ flex: '1 1 220px', minWidth: '200px', height: '36px' }}
                    value={searchAdvanced.style}
                    onChange={(e) => setSearchAdvanced((prev) => ({ ...prev, style: e.target.value }))}
                  >
                    <option value="">{t('common.none')}</option>
                    {styleOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="uu-row uu-gap-16 uu-wrap">
                <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                  <label className="uu-label" style={{ width: '90px' }}>{t('resources.detail.labels.ambiance') || 'Ambiance'}</label>
                  <select
                    className="uu-select"
                    style={{ flex: '1 1 220px', minWidth: '200px', height: '36px' }}
                    value={searchAdvanced.ambiance}
                    onChange={(e) => setSearchAdvanced((prev) => ({ ...prev, ambiance: e.target.value }))}
                  >
                    <option value="">{t('common.none')}</option>
                    {ambianceOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                  <label className="uu-label" style={{ width: '90px' }}>{t('resources.detail.labels.license') || 'Licence'}</label>
                  <select
                    className="uu-select"
                    style={{ flex: '1 1 220px', minWidth: '200px', height: '36px' }}
                    value={searchAdvanced.license}
                    onChange={(e) => setSearchAdvanced((prev) => ({ ...prev, license: e.target.value }))}
                  >
                    <option value="">{t('common.none')}</option>
                    {licenseOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="uu-row uu-gap-16 uu-wrap">
                <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                  <label className="uu-label" style={{ width: '90px' }}>{t('resources.type') || 'Type'}</label>
                  <select
                    className="uu-select"
                    style={{ flex: '1 1 220px', minWidth: '200px', height: '36px' }}
                    value={searchAdvanced.type}
                    onChange={(e) => setSearchAdvanced((prev) => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="">{t('common.none')}</option>
                    {typeOptions.map((val) => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
                <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                  <label className="uu-label" style={{ width: '90px' }}>{t('resources.detail.distribution') || 'Distribution'}</label>
                  <select
                    className="uu-select"
                    style={{ flex: '1 1 220px', minWidth: '200px', height: '36px' }}
                    value={searchAdvanced.distribution}
                    onChange={(e) => setSearchAdvanced((prev) => ({ ...prev, distribution: e.target.value }))}
                  >
                    <option value="">{t('common.none')}</option>
                    {distributionOptions.map((val) => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="uu-row uu-gap-16 uu-wrap">
                <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                  <label className="uu-label" style={{ width: '90px' }}>{t('resources.ueVersions') || 'UE'}</label>
                  <select
                    className="uu-select"
                    style={{ flex: '1 1 220px', minWidth: '200px', height: '36px' }}
                    value={searchAdvanced.ueVersion}
                    onChange={(e) => setSearchAdvanced((prev) => ({ ...prev, ueVersion: e.target.value }))}
                  >
                    <option value="">{t('common.none')}</option>
                    {ueOptions.map((val) => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
                <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                  <label className="uu-label" style={{ width: '90px' }}>{t('resources.seller') || 'Vendeur'}</label>
                  <select
                    className="uu-select"
                    style={{ flex: '1 1 220px', minWidth: '200px', height: '36px' }}
                    value={searchAdvanced.seller}
                    onChange={(e) => setSearchAdvanced((prev) => ({ ...prev, seller: e.target.value }))}
                  >
                    <option value="">{t('common.none')}</option>
                    {sellerOptions.map((val) => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="uu-row uu-gap-16 uu-wrap">
                <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                  <label className="uu-label" style={{ width: '90px' }}>{t('resources.detail.labels.quality') || 'Qualité'}</label>
                  <div className="uu-row uu-align-center uu-gap-8">
                    <div className="uu-rating">
                      {ratingValues.map((n) => (
                        <button
                          key={`adv-quality-${n}`}
                          type="button"
                          className={`uu-rating-btn ${searchAdvanced.quality >= n ? 'active' : ''}`}
                          onClick={() => setSearchAdvanced((prev) => ({
                            ...prev,
                            quality: prev.quality === n ? 0 : n,
                          }))}
                          aria-pressed={searchAdvanced.quality >= n ? 'true' : 'false'}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="uu-reset-btn uu-reset-neutral"
                      onClick={() => setSearchAdvanced((prev) => ({ ...prev, quality: 0 }))}
                      title={t('common.none') || 'Aucun'}
                      aria-label={t('common.none') || 'Aucun'}
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                  <label className="uu-label" style={{ width: '90px' }}>{t('resources.detail.labels.performance') || 'Performance'}</label>
                  <div className="uu-row uu-align-center uu-gap-8">
                    <div className="uu-rating">
                      {ratingValues.map((n) => (
                        <button
                          key={`adv-performance-${n}`}
                          type="button"
                          className={`uu-rating-btn ${searchAdvanced.performance >= n ? 'active' : ''}`}
                          onClick={() => setSearchAdvanced((prev) => ({
                            ...prev,
                            performance: prev.performance === n ? 0 : n,
                          }))}
                          aria-pressed={searchAdvanced.performance >= n ? 'true' : 'false'}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="uu-reset-btn uu-reset-neutral"
                      onClick={() => setSearchAdvanced((prev) => ({ ...prev, performance: 0 }))}
                      title={t('common.none') || 'Aucun'}
                      aria-label={t('common.none') || 'Aucun'}
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>

              <div className="uu-row uu-gap-16 uu-wrap">
                <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                  <label className="uu-label" style={{ width: '90px' }}>{t('resources.detail.labels.tags') || 'Tags'}</label>
                  <input
                    className="uu-input"
                    style={{ flex: '1 1 220px' }}
                    value={searchAdvanced.tags}
                    onChange={(e) => setSearchAdvanced((prev) => ({ ...prev, tags: e.target.value }))}
                    placeholder={t('resources.search.placeholderTags') || ''}
                  />
                </div>
                <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                  <label className="uu-label" style={{ width: '90px' }}>{t('resources.detail.labels.note') || 'Note'}</label>
                  <input
                    className="uu-input"
                    style={{ flex: '1 1 220px' }}
                    value={searchAdvanced.note}
                    onChange={(e) => setSearchAdvanced((prev) => ({ ...prev, note: e.target.value }))}
                    placeholder={t('resources.search.placeholderNote') || ''}
                  />
                </div>
              </div>
            </div>

            <div className="uu-row uu-align-center uu-gap-8">
              <button
                type="button"
                className="uu-btn"
                onClick={onCloseAdvanced}
              >
                {t('resources.search.close') || t('common.close') || 'Close'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

import MultiSelectDropdown from './MultiSelectDropdown.jsx';
import RatingStars from './RatingStars.jsx';

const ADVANCED_FIXED_WIDTH_STYLE = { width: '480px', minWidth: '480px', maxWidth: '480px' };

export default function ResourcesAdvancedSearchPanel({
  t,
  filteredCount = 0,
  searchAdvanced,
  setSearchAdvanced,
  noneLabel,
  usageOptions = [],
  styleOptions = [],
  ambianceOptions = [],
  licenseOptions = [],
  typeOptions = [],
  distributionOptions = [],
  ueOptions = [],
  sellerOptions = [],
  epicAccountOptions = [],
  ratingValues = [],
  selectStyle = null,
  onClose,
}) {
  const updateAdvanced = (field, value) => {
    setSearchAdvanced((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="uu-section">
      <div className="uu-card uu-col uu-gap-12">
        <div className="uu-row uu-align-center uu-gap-8 uu-wrap">
          <strong className="uu-block-title">{t('resources.search.advancedTitle')}</strong>
          <div className="uu-muted">
            {filteredCount ? `(${filteredCount} ${t('resources.search.resultsLabel')})` : ''}
          </div>
        </div>

        <div className="uu-col uu-gap-12">
          <div className="uu-row uu-gap-16 uu-wrap">
            <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
              <label className="uu-label w-90">{t('resources.detail.labels.usage')}</label>
              <MultiSelectDropdown
                options={usageOptions}
                values={searchAdvanced.usage}
                onChange={(values) => updateAdvanced('usage', values)}
                noneLabel={noneLabel}
                style={ADVANCED_FIXED_WIDTH_STYLE}
              />
            </div>
            <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
              <label className="uu-label w-90">{t('resources.detail.labels.style')}</label>
              <MultiSelectDropdown
                options={styleOptions}
                values={searchAdvanced.style}
                onChange={(values) => updateAdvanced('style', values)}
                noneLabel={noneLabel}
              />
            </div>
          </div>

          <div className="uu-row uu-gap-16 uu-wrap">
            <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
              <label className="uu-label w-90">{t('resources.detail.labels.ambiance')}</label>
              <MultiSelectDropdown
                options={ambianceOptions}
                values={searchAdvanced.ambiance}
                onChange={(values) => updateAdvanced('ambiance', values)}
                noneLabel={noneLabel}
                style={ADVANCED_FIXED_WIDTH_STYLE}
              />
            </div>
            <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
              <label className="uu-label w-90">{t('resources.detail.labels.license')}</label>
              <MultiSelectDropdown
                options={licenseOptions}
                values={searchAdvanced.license}
                onChange={(values) => updateAdvanced('license', values)}
                noneLabel={noneLabel}
              />
            </div>
          </div>

          <div className="uu-row uu-gap-16 uu-wrap">
            <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
              <label className="uu-label w-90">{t('resources.type')}</label>
              <MultiSelectDropdown
                options={typeOptions.map((value) => ({ value, label: value }))}
                values={searchAdvanced.type}
                onChange={(values) => updateAdvanced('type', values)}
                noneLabel={noneLabel}
                style={ADVANCED_FIXED_WIDTH_STYLE}
              />
            </div>
            <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
              <label className="uu-label w-90">{t('resources.detail.distribution')}</label>
              <MultiSelectDropdown
                options={distributionOptions.map((value) => ({ value, label: value }))}
                values={searchAdvanced.distribution}
                onChange={(values) => updateAdvanced('distribution', values)}
                noneLabel={noneLabel}
              />
            </div>
          </div>

          <div className="uu-row uu-gap-16 uu-wrap">
            <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
              <label className="uu-label w-90">{t('resources.ueVersions')}</label>
              <MultiSelectDropdown
                options={ueOptions.map((value) => ({ value, label: value }))}
                values={searchAdvanced.ueVersion}
                onChange={(values) => updateAdvanced('ueVersion', values)}
                noneLabel={noneLabel}
                style={ADVANCED_FIXED_WIDTH_STYLE}
              />
            </div>
            <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
              <label className="uu-label w-90">{t('resources.seller')}</label>
              <select
                className="uu-select"
                style={selectStyle || undefined}
                value={searchAdvanced.seller}
                onChange={(event) => updateAdvanced('seller', event.target.value)}
              >
                <option value="">{noneLabel}</option>
                {sellerOptions.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="uu-row uu-gap-16 uu-wrap">
            <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
              <label className="uu-label w-90">{t('resources.detail.labels.quality')}</label>
              <div className="uu-row uu-align-center uu-gap-8">
                <RatingStars
                  idPrefix="adv-quality"
                  value={searchAdvanced.quality}
                  stepValues={ratingValues}
                  onChange={(quality) => updateAdvanced('quality', quality)}
                />
                <button
                  type="button"
                  className="uu-reset-btn uu-reset-neutral"
                  onClick={() => updateAdvanced('quality', 0)}
                  title={noneLabel}
                  aria-label={noneLabel}
                >
                  ×
                </button>
              </div>
            </div>
            <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
              <label className="uu-label w-90">{t('resources.detail.labels.performance')}</label>
              <div className="uu-row uu-align-center uu-gap-8">
                <RatingStars
                  idPrefix="adv-performance"
                  value={searchAdvanced.performance}
                  stepValues={ratingValues}
                  onChange={(performance) => updateAdvanced('performance', performance)}
                />
                <button
                  type="button"
                  className="uu-reset-btn uu-reset-neutral"
                  onClick={() => updateAdvanced('performance', 0)}
                  title={noneLabel}
                  aria-label={noneLabel}
                >
                  ×
                </button>
              </div>
            </div>
          </div>

          <div className="uu-row uu-gap-16 uu-wrap">
            <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
              <label className="uu-label w-90">{t('resources.detail.labels.tags')}</label>
              <input
                className="uu-input"
                style={ADVANCED_FIXED_WIDTH_STYLE}
                value={searchAdvanced.tags}
                onChange={(event) => updateAdvanced('tags', event.target.value)}
                placeholder={t('resources.search.placeholderTags')}
              />
            </div>
            <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
              <label className="uu-label w-90">
                {t('resources.detail.labels.epicAccount')}
              </label>
              <select
                className="uu-select"
                style={selectStyle || undefined}
                value={searchAdvanced.epicAccount}
                onChange={(event) => updateAdvanced('epicAccount', event.target.value)}
              >
                <option value="">{noneLabel}</option>
                {epicAccountOptions.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="uu-row uu-align-center uu-gap-8">
          <button
            type="button"
            className="uu-btn"
            onClick={onClose}
          >
            {t('resources.search.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

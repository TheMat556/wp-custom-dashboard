<?php
/**
 * Dashboard payload service.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Dashboard;

defined( 'ABSPATH' ) || exit;

/**
 * Aggregates dashboard concern services into the REST/bootstrap payload.
 */
final class DashboardPayloadService {
	public function __construct(
		private DashboardMetricsService $metrics,
		private DashboardStatusService $status,
		private DashboardActionService $actions,
		private DashboardCalendarService $calendar
	) {}

	/**
	 * Returns the full dashboard payload.
	 *
	 * @return array
	 */
	public function get_dashboard_data(): array {
		return array(
			'atAGlance'           => $this->metrics->get_at_a_glance(),
			'siteHealth'          => $this->metrics->get_site_health(),
			'pendingUpdates'      => $this->metrics->get_pending_updates(),
			'visitorTrend'        => $this->metrics->get_visitor_trend(),
			'countryStats'        => $this->metrics->get_country_stats(),
			'siteSpeed'           => $this->metrics->get_site_speed(),
			'pagesOverview'       => $this->metrics->get_pages_overview(),
			'actionItems'         => $this->actions->get_action_items(),
			'seoOverview'         => $this->status->get_seo_overview(),
			'seoBasics'           => $this->status->get_seo_basics(),
			'legalCompliance'     => $this->status->get_legal_compliance(),
			'businessFunctions'   => $this->status->get_business_functions(),
			'onboardingChecklist' => $this->status->get_onboarding_checklist(),
			'siteReadinessScore'  => $this->status->get_site_readiness_score(),
			'calendarPreview'     => $this->calendar->get_calendar_preview(),
		);
	}
}

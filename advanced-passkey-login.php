<?php
/**
 * Plugin Name: Advanced Passkeys for Secure Login
 * Plugin URI:  https://wordpress.org/plugins/advanced-passkey-login/
 * Description: Advanced Passkeys for Secure Login enables passwordless passkey login for WordPress. Supports Face ID, Touch ID, Windows Hello, YubiKey, and more.
 * Version:     1.1.9
 * Author:      wppasskey
 * Author URI:  https://profiles.wordpress.org/mbuiux/
 * License:     GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: advanced-passkey-login
 * Domain Path: /languages
 * Requires at least: 6.0
 * Tested up to: 7.0
 * Requires PHP: 8.0
 *
 * @package ADVAPAFO
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'ADVAPAFO_VERSION', '1.1.9' );
define( 'ADVAPAFO_PLUGIN_FILE', __FILE__ );
define( 'ADVAPAFO_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'ADVAPAFO_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

if ( ! function_exists( 'advapafo_template_render_scope' ) ) {
	/**
	 * Include a template file in isolated variable scope.
	 *
	 * @param string               $__template_path Absolute template path.
	 * @param array<string, mixed> $__args          Variables to expose to template.
	 */
	function advapafo_template_render_scope( string $__template_path, array $__args = array() ): void {
		if ( ! empty( $__args ) ) {
			extract( $__args, EXTR_SKIP ); // phpcs:ignore WordPress.PHP.DontExtract.extract_extract -- template views intentionally receive arg keys as local variables.
		}

		include $__template_path;
	}
}

if ( ! function_exists( 'advapafo_is_template_name_safe' ) ) {
	/**
	 * Validate relative template name and guard against traversal.
	 *
	 * @param string $template_name Relative template path.
	 * @return bool
	 */
	function advapafo_is_template_name_safe( string $template_name ): bool {
		if ( '' === $template_name ) {
			return false;
		}

		$normalized = wp_normalize_path( trim( $template_name ) );
		if ( '' === $normalized ) {
			return false;
		}

		if ( str_starts_with( $normalized, '/' ) || str_starts_with( $normalized, '\\' ) ) {
			return false;
		}

		if ( preg_match( '#(^|/|\\\\)\.\.($|/|\\\\)#', $normalized ) ) {
			return false;
		}

		if ( str_contains( $normalized, "\0" ) ) {
			return false;
		}

		return true;
	}
}

if ( ! function_exists( 'advapafo_is_template_path_allowed' ) ) {
	/**
	 * Ensure a resolved template path stays within known allowed roots.
	 *
	 * @param string             $resolved_path Absolute template path.
	 * @param array<int, string> $allowed_roots Allowed absolute root directories.
	 * @return bool
	 */
	function advapafo_is_template_path_allowed( string $resolved_path, array $allowed_roots ): bool {
		$real_file = realpath( $resolved_path ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_realpath -- realpath is required to validate canonical include paths.
		if ( false === $real_file ) {
			return false;
		}

		$real_file = wp_normalize_path( $real_file );

		foreach ( $allowed_roots as $root ) {
			$real_root = realpath( $root ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_realpath -- canonical path comparison for traversal protection.
			if ( false === $real_root ) {
				continue;
			}

			$real_root = wp_normalize_path( $real_root );
			if ( str_starts_with( $real_file, trailingslashit( $real_root ) ) || $real_file === $real_root ) {
				return true;
			}
		}

		return false;
	}
}

if ( ! function_exists( 'advapafo_get_template' ) ) {
	/**
	 * Locate and render a plugin template with child/parent theme overrides.
	 *
	 * Search order:
	 * 1) Child theme: /advanced-passkeys/{template}
	 * 2) Parent theme: /advanced-passkeys/{template}
	 * 3) Plugin fallback: /templates/{template}
	 *
	 * @param string               $template_name Relative template path (e.g. login/button.php).
	 * @param array<string, mixed> $args          Optional variables available in the template scope.
	 * @return string Absolute resolved template path, or empty string when not found/invalid.
	 */
	function advapafo_get_template( $template_name, $args = array() ) {
		$template_name = is_string( $template_name ) ? wp_normalize_path( trim( $template_name ) ) : '';
		$args          = is_array( $args ) ? $args : array();

		/**
		 * Filter template request context before template resolution.
		 *
		 * @param array{template_name:string,args:array<string,mixed>,theme_root:string,plugin_root:string} $context Template context.
		 */
		$context = apply_filters(
			'advapafo_get_template_part',
			array(
				'template_name' => $template_name,
				'args'          => $args,
				'theme_root'    => 'advanced-passkeys',
				'plugin_root'   => trailingslashit( ADVAPAFO_PLUGIN_DIR ) . 'templates',
			)
		);

		if ( ! is_array( $context ) ) {
			return '';
		}

		$template_name = isset( $context['template_name'] ) && is_string( $context['template_name'] )
			? wp_normalize_path( trim( $context['template_name'] ) )
			: '';
		$args          = isset( $context['args'] ) && is_array( $context['args'] ) ? $context['args'] : array();
		$theme_root    = isset( $context['theme_root'] ) && is_string( $context['theme_root'] ) && '' !== trim( $context['theme_root'] )
			? trim( $context['theme_root'], '/\\' )
			: 'advanced-passkeys';
		$plugin_root   = isset( $context['plugin_root'] ) && is_string( $context['plugin_root'] ) && '' !== trim( $context['plugin_root'] )
			? wp_normalize_path( untrailingslashit( trim( $context['plugin_root'] ) ) )
			: wp_normalize_path( untrailingslashit( trailingslashit( ADVAPAFO_PLUGIN_DIR ) . 'templates' ) );

		if ( ! advapafo_is_template_name_safe( $template_name ) ) {
			return '';
		}

		$relative_theme_path = trailingslashit( $theme_root ) . ltrim( $template_name, '/\\' );
		$located_template    = locate_template( array( $relative_theme_path ), false, false );

		if ( ! is_string( $located_template ) || '' === $located_template ) {
			$located_template = wp_normalize_path( trailingslashit( $plugin_root ) . ltrim( $template_name, '/\\' ) );
		}

		if ( ! is_string( $located_template ) || '' === $located_template || ! file_exists( $located_template ) ) {
			return '';
		}

		$allowed_roots = array(
			get_stylesheet_directory() . '/' . $theme_root,
			get_template_directory() . '/' . $theme_root,
			$plugin_root,
		);

		if ( ! advapafo_is_template_path_allowed( $located_template, $allowed_roots ) ) {
			return '';
		}

		advapafo_template_render_scope( $located_template, $args );

		return $located_template;
	}
}

// Allow env-based constant injection (same pattern used in planning-center-sso).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.VariableConstantNameFound -- dynamic constant names are constrained to ADVAPAFO_* entries in this allowlist.
foreach ( array(
	'ADVAPAFO_ALLOW_HTTP',
	'ADVAPAFO_RP_ID',
	'ADVAPAFO_RP_NAME',
	'ADVAPAFO_CHALLENGE_TTL',
	'ADVAPAFO_USER_VERIFICATION',
	'ADVAPAFO_RATE_WINDOW',
	'ADVAPAFO_RATE_MAX_ATTEMPTS',
	'ADVAPAFO_RATE_LOCKOUT',
	'ADVAPAFO_ENABLE_LOGGING',
) as $advapafo_env_const ) {
	if ( ! defined( $advapafo_env_const ) ) {
		$advapafo_env_value = getenv( $advapafo_env_const );
		if ( false !== $advapafo_env_value && '' !== $advapafo_env_value ) {
			define( $advapafo_env_const, $advapafo_env_value );
		}
	}
}
// phpcs:enable WordPress.NamingConventions.PrefixAllGlobals.VariableConstantNameFound
unset( $advapafo_env_const, $advapafo_env_value );

// ──────────────────────────────────────────────────────────────
// Composer autoload (lbuchs/webauthn)
// ──────────────────────────────────────────────────────────────
$advapafo_autoload = ADVAPAFO_PLUGIN_DIR . 'vendor/autoload.php';
if ( PHP_VERSION_ID >= 80000 && file_exists( $advapafo_autoload ) ) {
	$advapafo_should_load_autoloader = true;

	$advapafo_autoload_real = ADVAPAFO_PLUGIN_DIR . 'vendor/composer/autoload_real.php';
	if ( file_exists( $advapafo_autoload_real ) ) {
		$advapafo_autoload_real_src = file_get_contents( $advapafo_autoload_real ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local filesystem read for composer class detection.
		if ( is_string( $advapafo_autoload_real_src ) && preg_match( '/class\s+(ComposerAutoloaderInit[0-9a-fA-F_]+)/', $advapafo_autoload_real_src, $m ) ) {
			if ( ! empty( $m[1] ) && class_exists( (string) $m[1], false ) ) {
				$advapafo_should_load_autoloader = false;
			}
		}
	}

	if ( $advapafo_should_load_autoloader ) {
		require_once $advapafo_autoload;
	}
}
unset( $advapafo_autoload, $advapafo_should_load_autoloader, $advapafo_autoload_real, $advapafo_autoload_real_src );

/**
 * Run one-time option normalization tasks for advapafo_* keys.
 */
function advapafo_migrate_legacy_options_once(): void {
	if ( (int) get_option( 'advapafo_legacy_options_migrated_v1', 0 ) === 1 ) {
		return;
	}

	// Legacy free builds commonly stored a default cap of 5; move to unlimited.
	$legacy_cap = (int) get_option( 'advapafo_max_passkeys_per_user', 0 );
	if ( 5 === $legacy_cap ) {
		update_option( 'advapafo_max_passkeys_per_user', 0 );
	}

	update_option( 'advapafo_legacy_options_migrated_v1', 1, false );
}

/**
 * Ensure passkey cap defaults to unlimited for existing installs migrated earlier.
 */
function advapafo_remove_legacy_passkey_cap_once(): void {
	if ( (int) get_option( 'advapafo_cap_migrated_v1', 0 ) === 1 ) {
		return;
	}

	if ( (int) get_option( 'advapafo_max_passkeys_per_user', 0 ) === 5 ) {
		update_option( 'advapafo_max_passkeys_per_user', 0 );
	}

	update_option( 'advapafo_cap_migrated_v1', 1, false );
}

// ──────────────────────────────────────────────────────────────
// Load classes
// ──────────────────────────────────────────────────────────────
require_once ADVAPAFO_PLUGIN_DIR . 'includes/class-advapafo-passkeys.php';
require_once ADVAPAFO_PLUGIN_DIR . 'includes/class-advapafo-settings.php';
require_once ADVAPAFO_PLUGIN_DIR . 'includes/class-advapafo-login-form.php';
require_once ADVAPAFO_PLUGIN_DIR . 'includes/class-advapafo-shortcodes.php';
require_once ADVAPAFO_PLUGIN_DIR . 'includes/class-advapafo-integration-manager.php';

// ──────────────────────────────────────────────────────────────
// Bootstrap
// ──────────────────────────────────────────────────────────────
/**
 * Initialize plugin services after core/plugin load.
 */
function advapafo_init() {
	advapafo_migrate_legacy_options_once();
	advapafo_remove_legacy_passkey_cap_once();

	new ADVAPAFO_Passkeys();
	new ADVAPAFO_Login_Form();
	new ADVAPAFO_Shortcodes();
	new ADVAPAFO_Integration_Manager();

	if ( is_admin() ) {
		new ADVAPAFO_Settings();
	}
}
add_action( 'plugins_loaded', 'advapafo_init' );

/**
 * Detect whether the plugin is network-activated.
 */
function advapafo_is_network_active(): bool {
	if ( ! is_multisite() ) {
		return false;
	}

	$active = (array) get_site_option( 'active_sitewide_plugins', array() );
	return isset( $active[ plugin_basename( ADVAPAFO_PLUGIN_FILE ) ] );
}

/**
 * Run a callback for current site or across the whole network.
 *
 * @param bool     $network_wide Whether the plugin is network-activated.
 * @param callable $callback     Callback to run for each relevant site.
 */
function advapafo_for_each_site( bool $network_wide, callable $callback ): void {
	if ( ! is_multisite() || ! $network_wide ) {
		$callback();
		return;
	}

	$original_blog_id = get_current_blog_id();

	$page     = 1;
	$per_page = 200;

	do {
		$site_ids = get_sites(
			array(
				'fields' => 'ids',
				'number' => $per_page,
				'paged'  => $page,
			)
		);

		foreach ( $site_ids as $site_id ) {
			switch_to_blog( (int) $site_id );
			$callback();
			restore_current_blog();
		}

		++$page;
	} while ( ! empty( $site_ids ) );

	if ( get_current_blog_id() !== (int) $original_blog_id ) {
		switch_to_blog( (int) $original_blog_id );
		restore_current_blog();
	}
}

// ──────────────────────────────────────────────────────────────
// Activation / deactivation
// ──────────────────────────────────────────────────────────────
register_activation_hook( __FILE__, 'advapafo_activate' );
register_deactivation_hook( __FILE__, 'advapafo_deactivate' );

/**
 * Activation routine.
 *
 * @param bool $network_wide Whether plugin is being activated network-wide.
 */
function advapafo_activate( bool $network_wide = false ) {
	if ( version_compare( PHP_VERSION, '8.0', '<' ) ) {
		deactivate_plugins( plugin_basename( ADVAPAFO_PLUGIN_FILE ) );
		wp_die( esc_html__( 'Advanced Passkeys for Secure Login requires PHP 8.0 or higher. Please upgrade PHP before activating this plugin.', 'advanced-passkey-login' ) );
	}
	if ( version_compare( $GLOBALS['wp_version'], '6.0', '<' ) ) {
		deactivate_plugins( plugin_basename( ADVAPAFO_PLUGIN_FILE ) );
		wp_die( esc_html__( 'Advanced Passkeys for Secure Login requires WordPress 6.0 or higher. Please update WordPress before activating this plugin.', 'advanced-passkey-login' ) );
	}

	require_once ADVAPAFO_PLUGIN_DIR . 'includes/class-advapafo-passkeys.php';

	advapafo_for_each_site(
		$network_wide,
		static function (): void {
			ADVAPAFO_Passkeys::create_tables();
			ADVAPAFO_Passkeys::schedule_cron();
		}
	);

	flush_rewrite_rules();
}

/**
 * Deactivation routine.
 *
 * @param bool $network_wide Whether plugin is being deactivated network-wide.
 */
function advapafo_deactivate( bool $network_wide = false ) {
	require_once ADVAPAFO_PLUGIN_DIR . 'includes/class-advapafo-passkeys.php';

	advapafo_for_each_site(
		$network_wide,
		static function (): void {
			ADVAPAFO_Passkeys::unschedule_cron();
		}
	);

	// Nothing else to tear down on deactivation; tables are preserved until uninstall.
}

/**
 * Provision plugin tables/cron when a new site is created on multisite.
 *
 * @param WP_Site $new_site The newly provisioned site.
 */
function advapafo_multisite_initialize_site( WP_Site $new_site ): void {
	if ( ! advapafo_is_network_active() ) {
		return;
	}

	require_once ADVAPAFO_PLUGIN_DIR . 'includes/class-advapafo-passkeys.php';

	switch_to_blog( (int) $new_site->blog_id );
	ADVAPAFO_Passkeys::create_tables();
	ADVAPAFO_Passkeys::schedule_cron();
	restore_current_blog();
}
add_action( 'wp_initialize_site', 'advapafo_multisite_initialize_site' );

// ──────────────────────────────────────────────────────────────
// Settings link on Plugins page
// ──────────────────────────────────────────────────────────────
add_filter(
	'plugin_action_links_' . plugin_basename( __FILE__ ),
	function ( $links ) {
		$url = admin_url( 'options-general.php?page=advanced-passkey-login' );
		array_unshift( $links, sprintf( '<a href="%s">%s</a>', esc_url( $url ), esc_html__( 'Settings', 'advanced-passkey-login' ) ) );
		return $links;
	}
);

add_filter(
	'plugin_row_meta',
	function ( $links, $file ) {
		if ( plugin_basename( __FILE__ ) !== $file ) {
			return $links;
		}

		$links[] = sprintf(
			'<a href="%s" target="_blank" rel="noopener noreferrer">%s</a>',
			esc_url( 'https://wordpress.org/plugins/advanced-passkey-login/' ),
			esc_html__( 'Plugin Page', 'advanced-passkey-login' )
		);

		return $links;
	},
	10,
	2
);

// ──────────────────────────────────────────────────────────────
// Security notice for dev-only flags
// ──────────────────────────────────────────────────────────────
add_action(
	'admin_notices',
	function () {
		if ( ! is_admin() || ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$warnings = array();
		if ( defined( 'ADVAPAFO_ALLOW_HTTP' ) && ADVAPAFO_ALLOW_HTTP ) {
			$warnings[] = '<strong>ADVAPAFO_ALLOW_HTTP</strong> is enabled — insecure transport is allowed. Disable in production.';
		}
		if ( empty( $warnings ) ) {
			return;
		}
		echo '<div class="notice notice-error"><p><strong>Advanced Passkeys for Secure Login security warning:</strong></p><ul>';
		foreach ( $warnings as $w ) {
			echo '<li>' . wp_kses( $w, array( 'strong' => array() ) ) . '</li>';
		}
		echo '</ul></div>';
	}
);

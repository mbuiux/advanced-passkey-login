<?php
// phpcs:ignoreFile WordPress.Files.FileName.InvalidClassFileName -- legacy file naming kept for backward compatibility.
/**
 * ADVAPAFO_Login_Form — injects the passkey button into wp-login.php.
 *
 * @package ADVAPAFO
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Renders passkey controls on the default WordPress login form.
 */
class ADVAPAFO_Login_Form {
	/**
	 * Register login form hooks.
	 */

	public function __construct() {
		add_action( 'login_form', array( $this, 'render_passkey_button' ) );
		add_action( 'login_enqueue_scripts', array( $this, 'inject_username_webauthn_autocomplete' ) );
	}

	/**
	 * Ensure wp-login username field advertises passkey autofill eligibility.
	 */
	public function inject_username_webauthn_autocomplete(): void {
		$conditional_enabled = class_exists( 'ADVAPAFO_Passkeys' ) && method_exists( 'ADVAPAFO_Passkeys', 'is_conditional_ui_enabled' )
			? ADVAPAFO_Passkeys::is_conditional_ui_enabled()
			: false;

		if ( ! $conditional_enabled ) {
			return;
		}

		$autocomplete_value = (string) advapafo_get_setting( 'username_autocomplete_value', 'username webauthn' );

		wp_register_script( 'advapafo-login-username-autocomplete', false, array(), defined( 'ADVAPAFO_VERSION' ) ? ADVAPAFO_VERSION : '1.0.0', true );
		wp_enqueue_script( 'advapafo-login-username-autocomplete' );
		wp_add_inline_script(
			'advapafo-login-username-autocomplete',
			'(function(){function applyAutocomplete(){var input=document.getElementById("user_login");if(!input){return;}var desired=' . wp_json_encode( $autocomplete_value ) . ';if(!desired){return;}input.setAttribute("autocomplete",desired);}if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",applyAutocomplete);return;}applyAutocomplete();})();'
		);
	}

	/**
	 * Renders the "Sign in with Passkey" button below the default login form.
	 * Only shown when the WebAuthn library is available and passkeys are enabled.
	 */
	public function render_passkey_button(): void {
		if ( ! class_exists( 'ADVAPAFO_Passkeys' ) || ! ADVAPAFO_Passkeys::is_enabled() ) {
			return;
		}

		if ( ! class_exists( 'lbuchs\\WebAuthn\\WebAuthn' ) ) {
			return;
		}

		$show_sep      = (int) get_option( 'advapafo_show_separator', 1 ) === 1;
		$conditional_enabled = class_exists( 'ADVAPAFO_Passkeys' ) && method_exists( 'ADVAPAFO_Passkeys', 'is_conditional_ui_enabled' )
			? ADVAPAFO_Passkeys::is_conditional_ui_enabled()
			: false;
		if ( $conditional_enabled ) {
			$show_sep = false;
		}
		$style_classes = $this->get_button_style_class();

		if ( function_exists( 'advapafo_get_template' ) ) {
			$resolved = advapafo_get_template(
				'login/button.php',
				array(
					'advapafo_show_sep'            => $show_sep,
					'advapafo_conditional_enabled' => $conditional_enabled,
					'advapafo_style_classes'       => $style_classes,
				)
			);

			if ( is_string( $resolved ) && '' !== $resolved ) {
				return;
			}
		}

		?>

		<div id="advapafo-login-passkey-block" class="<?php echo esc_attr( $conditional_enabled ? 'advapafo-login-passkey-block--conditional-only' : '' ); ?>">
			<?php if ( $show_sep ) : ?>
			<div class="advapafo-login-separator" role="separator" aria-label="<?php esc_attr_e( 'or', 'advanced-passkey-login' ); ?>">
				<span><?php esc_html_e( 'OR', 'advanced-passkey-login' ); ?></span>
			</div>
			<?php endif; ?>

			<div class="<?php echo esc_attr( 'advapafo-login-passkey-wrap' . ( $show_sep ? '' : ' advapafo-no-separator' ) . ( $conditional_enabled ? ' advapafo-login-passkey-wrap--conditional-only' : '' ) ); ?>">
				<button type="button"
						id="advapafo-signin-passkey"
						class="button button-large advapafo-passkey-btn <?php echo esc_attr( $style_classes . ( $conditional_enabled ? ' advapafo-passkey-btn--hidden' : '' ) ); ?>"
						<?php echo $conditional_enabled ? 'hidden style="display:none"' : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static attribute literal. ?>
						aria-label="<?php esc_attr_e( 'Sign in with a passkey (Face ID, Touch ID, or security key)', 'advanced-passkey-login' ); ?>">
					<span class="advapafo-passkey-icon" aria-hidden="true">
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M19 11v6"/>
							<path d="M19 13h2"/>
							<path d="M2 21a8 8 0 0 1 12.868-6.349"/>
							<circle cx="10" cy="8" r="5"/>
							<circle cx="19" cy="19" r="2"/>
						</svg>
					</span>
					<?php esc_html_e( 'Sign in with Passkey', 'advanced-passkey-login' ); ?>
					<span class="advapafo-passkey-last-used-pill" aria-hidden="true" hidden>
						<?php esc_html_e( 'Last used', 'advanced-passkey-login' ); ?>
					</span>
				</button>
				<p id="advapafo-passkey-login-message"
					class="advapafo-login-message advapafo-is-hidden"
					aria-live="polite"
					></p>
			</div>
		</div>
		<?php
	}

	private function get_button_style_class(): string {
		$style = sanitize_key( (string) get_option( 'advapafo_button_style', 'black' ) );
		if ( 'light_grey' === $style ) {
			return 'advapafo-passkey-btn--light-grey';
		}

		return 'advapafo-passkey-btn--black';
	}

}

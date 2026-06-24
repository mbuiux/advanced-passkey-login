<?php
/**
 * Login passkey button template.
 *
 * Theme override path:
 * /advanced-passkeys/login/button.php
 *
 * @package ADVAPAFO
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$advapafo_show_sep            = isset( $advapafo_show_sep ) ? (bool) $advapafo_show_sep : false;
$advapafo_conditional_enabled = isset( $advapafo_conditional_enabled ) ? (bool) $advapafo_conditional_enabled : false;
$advapafo_style_classes       = isset( $advapafo_style_classes ) ? sanitize_html_class( (string) $advapafo_style_classes ) : 'advapafo-passkey-btn--black';
?>
<div id="advapafo-login-passkey-block" class="<?php echo esc_attr( $advapafo_conditional_enabled ? 'advapafo-login-passkey-block--conditional-only' : '' ); ?>">
	<?php if ( $advapafo_show_sep ) : ?>
	<div class="advapafo-login-separator" role="separator" aria-label="<?php esc_attr_e( 'or', 'advanced-passkey-login' ); ?>">
		<span><?php esc_html_e( 'OR', 'advanced-passkey-login' ); ?></span>
	</div>
	<?php endif; ?>

	<div class="<?php echo esc_attr( 'advapafo-login-passkey-wrap' . ( $advapafo_show_sep ? '' : ' advapafo-no-separator' ) . ( $advapafo_conditional_enabled ? ' advapafo-login-passkey-wrap--conditional-only' : '' ) ); ?>">
		<button type="button"
				id="advapafo-signin-passkey"
				class="button button-large advapafo-passkey-btn <?php echo esc_attr( $advapafo_style_classes . ( $advapafo_conditional_enabled ? ' advapafo-passkey-btn--hidden' : '' ) ); ?>"
				<?php echo $advapafo_conditional_enabled ? 'hidden style="display:none"' : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static attribute literal. ?>
				aria-label="<?php esc_attr_e( 'Sign in with a passkey (Face ID, Touch ID, or security key)', 'advanced-passkey-login' ); ?>">
			<span class="advapafo-passkey-icon" aria-hidden="true">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M12.4 2.7a2.5 2.5 0 0 1 3.4 0l5.5 5.5a2.5 2.5 0 0 1 0 3.4l-3.7 3.7a2.5 2.5 0 0 1-3.4 0L8.7 9.8a2.5 2.5 0 0 1 0-3.4z"/>
					<path d="m14 7 3 3"/>
					<path d="m9.4 10.6-6.814 6.814A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814"/>
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

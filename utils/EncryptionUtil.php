<?php
// utils/EncryptionUtil.php

class EncryptionUtil {
    // Clave de encriptación - EN PRODUCCIÓN DEBE SER UNA VARIABLE DE ENTORNO
    // Esta es solo para demostración
    private static $encryptionKey = 'TuClaveSecretaDe32CaracteresAqui123';
    private static $encryptionMethod = 'AES-256-CBC';
    
    /**
     * Encripta un texto
     * @param string $text Texto a encriptar
     * @return string Texto encriptado en base64
     */
    public static function encrypt($text) {
        if (empty($text)) return $text;
        
        $key = substr(hash('sha256', self::$encryptionKey, true), 0, 32);
        $iv = openssl_random_pseudo_bytes(openssl_cipher_iv_length(self::$encryptionMethod));
        
        $encrypted = openssl_encrypt($text, self::$encryptionMethod, $key, 0, $iv);
        
        // Combinamos el IV con el texto encriptado para poder desencriptar después
        return base64_encode($iv . '::' . $encrypted);
    }
    
    /**
     * Desencripta un texto
     * @param string $encryptedText Texto encriptado en base64
     * @return string Texto desencriptado
     */
    public static function decrypt($encryptedText) {
        if (empty($encryptedText)) return $encryptedText;
        
        try {
            $key = substr(hash('sha256', self::$encryptionKey, true), 0, 32);
            $decoded = base64_decode($encryptedText);
            
            list($iv, $encrypted) = explode('::', $decoded, 2);
            
            $decrypted = openssl_decrypt($encrypted, self::$encryptionMethod, $key, 0, $iv);
            
            return $decrypted !== false ? $decrypted : $encryptedText;
        } catch (Exception $e) {
            // Si hay algún error, devolvemos el texto original
            error_log("Error al desencriptar: " . $e->getMessage());
            return $encryptedText;
        }
    }
}
?>
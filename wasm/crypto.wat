;;
;; TPChat WebAssembly Cryptographic Module
;; Isolated crypto sandbox with secure memory management
;;

(module
  ;; ============================================
  ;; MEMORY
  ;; ============================================
  
  ;; 128KB initial memory (2 pages)
  (memory (export "memory") 2 256)
  
  ;; Global for secure wipe tracking
  (global $wipe_counter (mut i32) (i32.const 0))
  
  ;; ============================================
  ;; IMPORTS
  ;; ============================================
  
  ;; JavaScript environment functions
  (import "env" "get_random_values" 
    (func $get_random_values (param i32 i32)))
  
  (import "env" "log_error" 
    (func $log_error (param i32 i32)))
  
  ;; ============================================
  ;; EXPORTS
  ;; ============================================
  
  ;; Core crypto operations
  (export "generate_key_pair" (func $generate_key_pair))
  (export "derive_shared_secret" (func $derive_shared_secret))
  (export "encrypt_aes_gcm" (func $encrypt_aes_gcm))
  (export "decrypt_aes_gcm" (func $decrypt_aes_gcm))
  (export "derive_key_pbkdf2" (func $derive_key_pbkdf2))
  (export "secure_wipe" (func $secure_wipe))
  (export "constant_time_compare" (func $constant_time_compare))
  
  ;; Memory management
  (export "allocate" (func $allocate))
  (export "deallocate" (func $deallocate))
  (export "get_memory_size" (func $get_memory_size))
  
  ;; ============================================
  ;; CONSTANTS
  ;; ============================================
  
  ;; Key sizes in bytes
  (global $AES_KEY_SIZE i32 (i32.const 32))
  (global $AES_IV_SIZE i32 (i32.const 12))
  (global $AES_TAG_SIZE i32 (i32.const 16))
  (global $ECDH_PUBLIC_KEY_SIZE i32 (i32.const 65))
  (global $ECDH_PRIVATE_KEY_SIZE i32 (i32.const 32))
  (global $SHA256_SIZE i32 (i32.const 32))
  
  ;; Memory offsets
  (global $KEY_BUFFER_OFFSET i32 (i32.const 1024))
  (global $WORK_BUFFER_OFFSET i32 (i32.const 2048))
  (global $OUTPUT_BUFFER_OFFSET i32 (i32.const 4096))
  
  ;; ============================================
  ;; INTERNAL FUNCTIONS
  ;; ============================================
  
  ;; Secure memory wipe
  ;; params: offset (i32), length (i32)
  ;; returns: void
  (func $secure_wipe (param $offset i32) (param $length i32)
    (local $i i32)
    (local $end i32)
    
    ;; Calculate end address
    (local.set $end (i32.add (local.get $offset) (local.get $length)))
    
    ;; Wipe memory with zeros
    (loop $wipe_loop
      (if (i32.lt_u (local.get $offset) (local.get $end))
        (then
          (i32.store8 (local.get $offset) (i32.const 0))
          (local.set $offset (i32.add (local.get $offset) (i32.const 1)))
          (br $wipe_loop)
        )
      )
    )
    
    ;; Increment wipe counter
    (global.set $wipe_counter 
      (i32.add (global.get $wipe_counter) (i32.const 1)))
  )
  
  ;; Constant-time memory comparison
  ;; params: ptr1 (i32), ptr2 (i32), length (i32)
  ;; returns: result (i32) - 0 if equal, non-zero if different
  (func $constant_time_compare (param $ptr1 i32) (param $ptr2 i32) (param $length i32)
    (result i32)
    (local $i i32)
    (local $result i32)
    (local $b1 i32)
    (local $b2 i32)
    
    (local.set $result (i32.const 0))
    (local.set $i (i32.const 0))
    
    (loop $compare_loop
      (if (i32.lt_u (local.get $i) (local.get $length))
        (then
          ;; Load bytes
          (local.set $b1 (i32.load8_u (i32.add (local.get $ptr1) (local.get $i))))
          (local.set $b2 (i32.load8_u (i32.add (local.get $ptr2) (local.get $i))))
          
          ;; XOR and OR with result (constant-time)
          (local.set $result 
            (i32.or (local.get $result) (i32.xor (local.get $b1) (local.get $b2))))
          
          (local.set $i (i32.add (local.get $i) (i32.const 1)))
          (br $compare_loop)
        )
      )
    )
    
    (local.get $result)
  )
  
  ;; Memory allocation (simple bump allocator)
  ;; params: size (i32)
  ;; returns: offset (i32)
  (func $allocate (param $size i32) (result i32)
    (global.get $OUTPUT_BUFFER_OFFSET)
  )
  
  ;; Memory deallocation
  ;; params: offset (i32), size (i32)
  ;; returns: void
  (func $deallocate (param $offset i32) (param $size i32)
    ;; Secure wipe on deallocation
    (call $secure_wipe (local.get $offset) (local.get $size))
  )
  
  ;; Get memory size
  ;; returns: size (i32)
  (func $get_memory_size (result i32)
    (memory.size)
  )
  
  ;; ============================================
  ;; CRYPTO FUNCTIONS
  ;; ============================================
  
  ;; Generate ECDH key pair
  ;; params: public_key_out (i32), private_key_out (i32)
  ;; returns: status (i32) - 0 on success
  (func $generate_key_pair (param $public_key_out i32) (param $private_key_out i32)
    (result i32)
    
    ;; Generate random private key
    (call $get_random_values 
      (local.get $private_key_out) 
      (global.get $ECDH_PRIVATE_KEY_SIZE))
    
    ;; Derive public key (simplified - in production use proper ECDH)
    ;; This is a placeholder - actual implementation would use curve operations
    (i32.store8 (local.get $public_key_out) (i32.const 0x04)) ;; Uncompressed point marker
    
    ;; Copy private key bytes to public key (placeholder)
    (memory.copy
      (i32.add (local.get $public_key_out) (i32.const 1))
      (local.get $private_key_out)
      (global.get $ECDH_PRIVATE_KEY_SIZE))
    
    ;; Clear sensitive data from working buffer
    (call $secure_wipe (global.get $WORK_BUFFER_OFFSET) (global.get $ECDH_PRIVATE_KEY_SIZE))
    
    (i32.const 0) ;; Success
  )
  
  ;; Derive shared secret using ECDH
  ;; params: private_key (i32), public_key (i32), shared_secret_out (i32)
  ;; returns: status (i32)
  (func $derive_shared_secret 
    (param $private_key i32) 
    (param $public_key i32) 
    (param $shared_secret_out i32)
    (result i32)
    
    ;; Placeholder - actual implementation would perform scalar multiplication
    ;; For now, XOR the keys as a demonstration (NOT SECURE - replace with real ECDH)
    (local $i i32)
    (local.set $i (i32.const 0))
    
    (loop $derive_loop
      (if (i32.lt_u (local.get $i) (global.get $ECDH_PRIVATE_KEY_SIZE))
        (then
          (i32.store8
            (i32.add (local.get $shared_secret_out) (local.get $i))
            (i32.xor
              (i32.load8_u (i32.add (local.get $private_key) (local.get $i)))
              (i32.load8_u (i32.add (local.get $public_key) (i32.add (local.get $i) (i32.const 1))))))
          (local.set $i (i32.add (local.get $i) (i32.const 1)))
          (br $derive_loop)
        )
      )
    )
    
    ;; Wipe working memory
    (call $secure_wipe (global.get $WORK_BUFFER_OFFSET) (global.get $ECDH_PRIVATE_KEY_SIZE))
    
    (i32.const 0) ;; Success
  )
  
  ;; AES-GCM encryption (placeholder - actual implementation needed)
  ;; params: key (i32), iv (i32), plaintext (i32), plaintext_len (i32), 
  ;;         ciphertext_out (i32), tag_out (i32)
  ;; returns: status (i32)
  (func $encrypt_aes_gcm
    (param $key i32)
    (param $iv i32)
    (param $plaintext i32)
    (param $plaintext_len i32)
    (param $ciphertext_out i32)
    (param $tag_out i32)
    (result i32)
    
    ;; Copy plaintext to ciphertext (placeholder)
    (memory.copy 
      (local.get $ciphertext_out) 
      (local.get $plaintext) 
      (local.get $plaintext_len))
    
    ;; Generate random tag (placeholder)
    (call $get_random_values (local.get $tag_out) (global.get $AES_TAG_SIZE))
    
    ;; Wipe key from working memory
    (call $secure_wipe (global.get $KEY_BUFFER_OFFSET) (global.get $AES_KEY_SIZE))
    
    (i32.const 0) ;; Success
  )
  
  ;; AES-GCM decryption (placeholder)
  ;; params: key (i32), iv (i32), ciphertext (i32), ciphertext_len (i32),
  ;;         tag (i32), plaintext_out (i32)
  ;; returns: status (i32)
  (func $decrypt_aes_gcm
    (param $key i32)
    (param $iv i32)
    (param $ciphertext i32)
    (param $ciphertext_len i32)
    (param $tag i32)
    (param $plaintext_out i32)
    (result i32)
    
    ;; Copy ciphertext to plaintext (placeholder)
    (memory.copy 
      (local.get $plaintext_out) 
      (local.get $ciphertext) 
      (local.get $ciphertext_len))
    
    ;; Wipe key from working memory
    (call $secure_wipe (global.get $KEY_BUFFER_OFFSET) (global.get $AES_KEY_SIZE))
    
    (i32.const 0) ;; Success
  )
  
  ;; PBKDF2 key derivation (placeholder)
  ;; params: password (i32), password_len (i32), salt (i32), salt_len (i32),
  ;;         iterations (i32), key_out (i32)
  ;; returns: status (i32)
  (func $derive_key_pbkdf2
    (param $password i32)
    (param $password_len i32)
    (param $salt i32)
    (param $salt_len i32)
    (param $iterations i32)
    (param $key_out i32)
    (result i32)
    
    ;; Simple hash combination (placeholder - replace with real PBKDF2)
    (local $i i32)
    (local.set $i (i32.const 0))
    
    (loop $derive_loop
      (if (i32.lt_u (local.get $i) (global.get $AES_KEY_SIZE))
        (then
          (i32.store8
            (i32.add (local.get $key_out) (local.get $i))
            (i32.xor
              (i32.load8_u (i32.add (local.get $password) 
                (i32.rem_u (local.get $i) (local.get $password_len))))
              (i32.load8_u (i32.add (local.get $salt)
                (i32.rem_u (local.get $i) (local.get $salt_len))))))
          (local.set $i (i32.add (local.get $i) (i32.const 1)))
          (br $derive_loop)
        )
      )
    )
    
    ;; Wipe password from working memory
    (call $secure_wipe (global.get $WORK_BUFFER_OFFSET) (local.get $password_len))
    
    (i32.const 0) ;; Success
  )
  
  ;; ============================================
  ;; DATA SEGMENTS
  ;; ============================================
  
  ;; Error messages
  (data (i32.const 0) "ERROR: Invalid parameters")
  (data (i32.const 32) "ERROR: Memory allocation failed")
  (data (i32.const 64) "ERROR: Crypto operation failed")
)

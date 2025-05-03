let encoder = new TextEncoder();

/**
 * Проверяет HMAC-SHA256 подпись для GitHub webhook.
 *
 * @param secret – ваш общий секрет из настроек вебхука.
 * @param header – значение заголовка "x-hub-signature-256" вида "sha256=...".
 * @param payload – сырое тело запроса в виде строки (JSON).
 * @returns Promise<boolean> – true, если подпись совпадает, иначе false.
 */
export async function verifySignature(secret: string, header: string, payload: string) {
    let parts = header.split("=");
    let sigHex = parts[1];

    let algorithm = { name: "HMAC", hash: { name: 'SHA-256' } };

    let keyBytes = encoder.encode(secret);
    let extractable = false;
    let key = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        algorithm,
        extractable,
        [ "sign", "verify" ],
    );

    let sigBytes = hexToBytes(sigHex);
    let dataBytes = encoder.encode(payload);
    let equal = await crypto.subtle.verify(
        algorithm.name,
        key,
        sigBytes,
        dataBytes,
    );

    return equal;
}


/**
 * Преобразует строку в шестнадцатеричном формате в Uint8Array.
 *
 * @param hex – строка, каждый два символа которой представляют один байт.
 * @returns Uint8Array – массив байт, соответствующий hex-строке.
 */
function hexToBytes(hex: string) {
    let len = hex.length / 2;
    let bytes = new Uint8Array(len);

    let index = 0;
    for (let i = 0; i < hex.length; i += 2) {
        let c = hex.slice(i, i + 2);
        let b = parseInt(c, 16);
        bytes[index] = b;
        index += 1;
    }

    return bytes;
}
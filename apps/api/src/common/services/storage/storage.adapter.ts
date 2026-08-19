export interface StorageAdapter {
  /**
   * Persiste un buffer y devuelve la URL pública accesible por los clientes.
   */
  upload(buffer: Buffer, key: string, mimeType: string): Promise<string>

  /**
   * Elimina el objeto correspondiente a una URL previamente devuelta por `upload`.
   * Es seguro llamarlo con cualquier URL (local o remota); si no pertenece a este
   * adaptador, simplemente no hace nada.
   */
  delete(url: string): Promise<void>
}

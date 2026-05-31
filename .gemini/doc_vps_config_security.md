# Guía Maestra de Puesta a Punto, Securización y Administración de Servidores VPS con Plesk
## Manual Completo de Hardening, Configuración de Red, Gestión de Dominios e Integración de Entornos de Desarrollo (AlmaLinux 9 y Ubuntu 26.04)

Este documento contiene la recopilación exhaustiva e íntegra de todos los diagnósticos, estrategias de seguridad, correcciones de errores, comandos avanzados y configuraciones. Diseñado para servir como manual técnico definitivo para la desinfección, fortificación y despliegue profesional en tu servidor VPS de Hostinger con el panel Plesk Obsidian (Web Admin Edition).

---

## Índice
1. Análisis Forense e Incidente de Seguridad (Malware de CPU)
2. Estrategia de Seguridad Perimetral y Firewalls en Capas
3. Gestión Estricta de Usuarios y Privilegios Mínimos
4. Hardening Avanzado de SSH (Migración al Puerto Seguro 21125)
5. Protección Proactiva Automatizada (Fail2Ban)
6. Configuración Profesional e Identidad Corporativa en Plesk
7. Integración Completa de PNPM en el Ecosistema de Plesk



## 1. Análisis Forense e Incidente de Seguridad (Malware de CPU)

### Sintomatología Inicial
El servidor experimentaba suspensiones y limitaciones automatizadas aplicadas por los sistemas de protección de infraestructura de Hostinger. 
* **Comando Ejecutado:** `/usr/bin/apache --config=/dev/shm/httpd.json`
* **Consumo de CPU:** **46% constante**

### Indicadores de Compromiso (IoC) Analizados
1. **Ruta de Ejecución (`/dev/shm/`):** Directorio de memoria RAM volátil. Ninguna instalación legítima de Apache aloja sus binarios aquí.
2. **Falsificación de Configuración (`httpd.json`):** Apache utiliza extensiones `.conf`. Una extensión `.json` delata un script o ejecutable malicioso (minería o botnet).
3. **Suplantación de Identidad:** El proceso se autodenomina `apache` para camuflarse.

### Protocolo de Actuación
* **Acción Recomendada:** Respaldo exclusivo de datos crudos (archivos fuente, assets limpios y volcados SQL) y **reinstalación limpia desde cero** del S.O.
* **Comandos de Mitigación Manual de Emergencia:**
  ```bash
  # Localizar el identificador (PID)
  ps aux | grep /dev/shm/httpd.json
  
  # Terminar la ejecución
  kill -9 <NUMERO_PID>
  
  # Eliminar los archivos residuales
  rm -rf /dev/shm/httpd.json
  
  # Inspeccionar persistencias
  crontab -l
  ```


## 2. Estrategia de Seguridad Perimetral y Firewalls en Capas

### Capa Externa: Firewall de Red de Hostinger (hPanel)
Filtra el tráfico en la infraestructura del proveedor.
* **Ubicación:** Hostinger hPanel > VPS > Administrar > Seguridad > Firewall.
* **Reglas de Entrada (Inbound Rules):**
  * **HTTP (TCP 80):** 0.0.0.0/0 (Permitir)
  * **HTTPS (TCP 443):** 0.0.0.0/0 (Permitir)
  * **Plesk Panel (TCP 8443):** 0.0.0.0/0 (Permitir)
  * **SSH Oculto (TCP 21125):** 0.0.0.0/0 (Permitir)
  * **SSH Viejo (TCP 22):** 0.0.0.0/0 (Denegar tras migrar)

### Capa Interna: Cortafuegos del Sistema Operativo

#### En AlmaLinux 9 (`firewalld`)
```bash
dnf install firewalld -y
systemctl enable --now firewalld

firewall-cmd --permanent --add-port=21125/tcp
firewall-cmd --permanent --add-port=8443/tcp
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --remove-service=ssh
firewall-cmd --reload

# Ubuntu commands
ufw allow 21125/tcp
ufw allow 8443/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## 3. Gestión Estricta de Usuarios y Privilegios Mínimos

Es obligatorio aislar los entornos mediante usuarios sin privilegios globales para evitar que vulnerabilidades web comprometan todo el servidor.

#### En AlmaLinux 9 (Grupo `wheel`)
```bash
useradd devuser
usermod -aG wheel devuser
passwd devuser

# Ubuntu commands
adduser devuser
usermod -aG sudo devuser
```


## 4. Hardening Avanzado de SSH (Migración al Puerto Seguro 21125)

### Procedimiento en AlmaLinux 9
```bash
# 1. Autorizar en SELinux
dnf install policycoreutils-python-utils -y
semanage port -a -t ssh_port_t -p tcp 21125

# 2. Imponer directiva SSH (Anular Cloud-Init)
echo "Port 21125" > /etc/ssh/sshd_config.d/99-custom-port.conf

# 3. Reiniciar
systemctl restart sshd
```

### Procedimiento en Ubuntu 26.04 (Socket Activation)
```bash
# 1. Desactivar el Socket interceptor de Systemd
systemctl disable --now ssh.socket
systemctl enable --now ssh.service

# 2. Imponer directiva SSH
echo "Port 21125" > /etc/ssh/sshd_config.d/99-custom-port.conf

# 3. Reiniciar y Auditar
systemctl restart ssh
ss -tulpn | grep ssh
```

## 5. Protección Proactiva Automatizada (Fail2Ban)

### Instalación en AlmaLinux 9
```bash
dnf install epel-release -y
dnf install fail2ban -y
systemctl enable --now fail2ban
```
### Instalación en Ubuntu
```bash
apt install fail2ban -y
systemctl enable --now fail2ban
```

## 6. Configuración Profesional e Identidad Corporativa en Plesk

### Acceso Seguro por Dominio Propio (Hostname y SSL)
#### 1. Apuntamiento DNS
En tu proveedor de dominio añade un **Registro A**:
* **Host:** `panel`
* **Valor:** `46.202.140.68`

#### 2. Sincronizar el Hostname (Consola)
```bash
sudo hostnamectl set-hostname panel.beilsbellezahonesta.com
sudo plesk bin server_pref --update -hostname panel.beilsbellezahonesta.com
sudo systemctl restart sw-cp-server sw-engine
```

#### 3. Instalación del Certificado SSL (Interfaz Plesk)
1. Ve a Sitios web y dominios > Crear panel.beilsbellezahonesta.com.

2. Clic en Certificados SSL/TLS.

3. Selecciona Let's Encrypt.

4. Obligatorio: Marca "Asegurar el panel de Plesk" (Secure Plesk).

5. Clic en Obtener de forma gratuita.

Resolución de Restricciones en Dominios
Si aparece el error: "Cannot use the domain name because it resolves to another server..."

**Solución:** Ve a tu proveedor, inyecta el Registro A a tu IP, espera unos minutos a que propague e intenta crearlo de nuevo en Plesk.

## 7. Integración Completa de PNPM en el Ecosistema de Plesk

### Método A: Orquestación Automatizada (GUI de Plesk)
1. En tu `package.json` local:
   ```json
   {
     "scripts": {
       "plesk-install": "npx pnpm install",
       "build": "npx pnpm run build"
     }
   }
   ```

2. Sube a Plesk y abre la extensión Node.js.

3. Clic en Ejecutar script, escribe plesk-install y ejecuta.

# Método B: Integración Global en Consola (SSH)
Si tu proyecto requiere Node 20 en Plesk:

```bash
# Instalar pnpm globalmente en el directorio aislado de Plesk
sudo /opt/plesk/node/20/bin/npm install -g pnpm

# Crear enlace simbólico para uso directo
sudo ln -s /opt/plesk/node/20/bin/pnpm /usr/local/bin/pnpm

# Uso
pnpm install
pnpm build

```


# REGISTRAR DNS DOMINIOS + SUBDOMINIOS + VERIFICAR PROPIEDAD CERTIFICADO SSL
### Fase 1: Crear el Subdominio mediante Registros DNS

Para apuntar un subdominio (por ejemplo, `api.tudominio.com` o `app.tudominio.com`) a tu servidor, la forma más limpia y profesional es usar un **Registro A** (Address Record) en tu proveedor de dominio.

1. Inicia sesión en tu cuenta de Hostinger (hPanel).
2. Navega a la sección superior **Dominios** y selecciona el dominio principal sobre el que quieres crear el subdominio.
3. En el menú lateral izquierdo, haz clic en **DNS / Nameservers** (o Editor de Zona DNS).
4. Busca el formulario para añadir un nuevo registro en la parte superior de la lista.
5. Configura los campos exactamente de esta manera:
   * **Tipo:** Selecciona `A`.
   * **Nombre (o Host):** Escribe únicamente la palabra del subdominio, sin el punto ni el dominio principal. Por ejemplo, si quieres crear `api.tudominio.com`, escribe solo `api`.
   * **Apunta a (o Valor):** Introduce la dirección IP pública de tu servidor (ejemplo: `46.202.140.68`).
   * **TTL (Time To Live):** Déjalo en el valor por defecto (suele ser `14400` o `3600` segundos).
6. Haz clic en el botón **Añadir Registro**.


### Fase 2: El Tiempo de Propagación en Internet

Una vez guardado el registro, tu servidor DNS en Hostinger se actualiza inmediatamente, pero el resto de los proveedores de internet en el mundo (Movistar, Vodafone, Google, Cloudflare, etc.) tardan un tiempo en enterarse de esta nueva dirección. Esto se conoce como propagación DNS.

**Los tiempos estándar que debes manejar:**
* **Promedio habitual:** Entre 15 y 30 minutos.
* **Tiempo máximo oficial:** Hasta 24 horas (muy raro hoy en día para registros nuevos, pero posible en cachés estrictas).

**Cómo verificar la propagación:**
Para no depender de la caché de tu propio navegador web, la mejor práctica es usar herramientas externas que consultan servidores de todo el mundo al mismo tiempo.
1. Entra a una web de comprobación global como **whatsmydns.net**.
2. Escribe tu subdominio completo (ej. `api.tudominio.com`).
3. Selecciona el tipo de registro **A**.
4. Haz clic en Buscar. Verás un mapa mundial con tildes verdes y cruces rojas. Cuando la mayoría de los países devuelvan tu IP correcta, el subdominio ya es accesible.

### Fase 3: Verificación Manual de Certificado SSL a través de DNS

Cuando emites un certificado SSL (como Let's Encrypt) de forma manual o solicitas un certificado *Wildcard* (que cubra `*.tudominio.com`), la entidad certificadora necesita confirmar que eres el dueño real del dominio. Para ello, te pedirá que crees un registro de texto (TXT) temporal.

**Paso 1: Obtener el valor del desafío (Challenge)**
Tu servidor o el cliente de Let's Encrypt (Certbot, SSL It!, etc.) generará un código criptográfico durante el proceso de emisión y pausará la instalación pidiéndote que añadas un registro DNS específico, generalmente llamado `_acme-challenge`.

**Paso 2: Crear el Registro TXT en Hostinger**
1. Vuelve al **Editor de Zona DNS** en el panel de tu dominio en Hostinger.
2. En el formulario de nuevo registro, cambia el **Tipo** a `TXT`.
3. En el campo **Nombre (o Host)**, escribe el nombre del desafío seguido del subdominio. Si el certificado es para `api.tudominio.com`, debes escribir exactamente `_acme-challenge.api`.
4. En el campo **Valor (o Texto TXT)**, pega el código alfanumérico largo que te proporcionó el instalador del certificado.
5. Haz clic en **Añadir Registro**.

**Paso 3: Esperar y validar**
Este es el punto donde más errores ocurren. **No pulses el botón de continuar/verificar en tu servidor todavía.**
1. Vuelve a **whatsmydns.net**.
2. Escribe `_acme-challenge.api.tudominio.com` (o el que corresponda).
3. Cambia el tipo de búsqueda a **TXT**.
4. Haz clic en Buscar.
5. Solo cuando veas que la mayoría de los servidores mundiales devuelven el código que acabas de pegar, vuelve a tu servidor o panel web y presiona el botón para completar la verificación del SSL. La entidad certificadora leerá el registro TXT y emitirá tu candado verde al instante.
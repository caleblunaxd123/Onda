# Arquitectura futura de suscripciones — no implementada

Separar dominio de facturación y autorización: Plans, Products, Prices, Subscriptions,
UserEntitlements, PurchaseEvents, BillingProviderEvents y AIUsageLedger.
Contratos previstos: IBillingProvider, ISubscriptionService, IEntitlementService,
IUsageLimitService, IAIQuotaService; anuncios separados mediante IAdPlacementService.
No introducir tablas/interfaces vacías solo para declarar terminada la arquitectura.

El servidor verificará derechos frente al proveedor; nunca confiar en isPremium del cliente.
Webhooks autenticados, eventId único, procesamiento idempotente, renovación/vencimiento,
gracia/cancelación y restauración comprobados en sandbox antes de producción.
Downgrade conserva datos; aplica límites de nuevas altas sin eliminar comunidades/bibliotecas.
AI: presupuesto diario, cuotas, ledger, caché y timeout, sin dependencia para funciones básicas.

Evaluar RevenueCat frente a Google Play Billing/StoreKit mediante documentación oficial vigente.
Faltan cuentas de tiendas, productos sandbox, claves/configuración y beneficios validados.
No pedir secretos en el chat ni activar compras reales sin autorización específica.

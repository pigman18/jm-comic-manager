.class final synthetic Lcom/google/android/gms/ads/internal/zzd;
.super Ljava/lang/Object;
.source "com.google.android.gms:play-services-ads@@19.6.0"

# interfaces
.implements Lcom/google/android/gms/internal/ads/zzdyj;


# static fields
.field static final zzbon:Lcom/google/android/gms/internal/ads/zzdyj;


# direct methods
.method static constructor <clinit>()V
    .locals 1

    new-instance v0, Lcom/google/android/gms/ads/internal/zzd;

    invoke-direct {v0}, Lcom/google/android/gms/ads/internal/zzd;-><init>()V

    sput-object v0, Lcom/google/android/gms/ads/internal/zzd;->zzbon:Lcom/google/android/gms/internal/ads/zzdyj;

    return-void
.end method

.method private constructor <init>()V
    .locals 0

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public final zzf(Ljava/lang/Object;)Lcom/google/android/gms/internal/ads/zzdzl;
    .locals 2

    .line 1
    check-cast p1, Lorg/json/JSONObject;

    const-string v0, "isSuccessful"

    const/4 v1, 0x0

    .line 2
    invoke-virtual {p1, v0, v1}, Lorg/json/JSONObject;->optBoolean(Ljava/lang/String;Z)Z

    move-result v0

    if-eqz v0, :cond_0

    const-string v0, "appSettingsJson"

    .line 3
    invoke-virtual {p1, v0}, Lorg/json/JSONObject;->getString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object p1

    .line 4
    invoke-static {}, Lcom/google/android/gms/ads/internal/zzp;->zzku()Lcom/google/android/gms/internal/ads/zzaxs;

    move-result-object v0

    .line 5
    invoke-virtual {v0}, Lcom/google/android/gms/internal/ads/zzaxs;->zzxq()Lcom/google/android/gms/ads/internal/util/zzf;

    move-result-object v0

    .line 6
    invoke-interface {v0, p1}, Lcom/google/android/gms/ads/internal/util/zzf;->zzee(Ljava/lang/String;)V

    :cond_0
    const/4 p1, 0x0

    .line 7
    invoke-static {p1}, Lcom/google/android/gms/internal/ads/zzdyz;->zzag(Ljava/lang/Object;)Lcom/google/android/gms/internal/ads/zzdzl;

    move-result-object p1

    return-object p1
.end method

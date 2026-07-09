.class public final Lcom/google/android/gms/ads/internal/zzf;
.super Ljava/lang/Object;
.source "com.google.android.gms:play-services-ads@@19.6.0"

# interfaces
.implements Lcom/google/android/gms/internal/ads/zzdv;
.implements Ljava/lang/Runnable;


# instance fields
.field private context:Landroid/content/Context;

.field private final zzbop:Ljava/util/List;
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "Ljava/util/List<",
            "[",
            "Ljava/lang/Object;",
            ">;"
        }
    .end annotation
.end field

.field private final zzboq:Ljava/util/concurrent/atomic/AtomicReference;
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "Ljava/util/concurrent/atomic/AtomicReference<",
            "Lcom/google/android/gms/internal/ads/zzdv;",
            ">;"
        }
    .end annotation
.end field

.field private final zzbor:Ljava/util/concurrent/atomic/AtomicReference;
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "Ljava/util/concurrent/atomic/AtomicReference<",
            "Lcom/google/android/gms/internal/ads/zzdv;",
            ">;"
        }
    .end annotation
.end field

.field private zzbos:Lcom/google/android/gms/internal/ads/zzayt;

.field private zzbot:Ljava/util/concurrent/CountDownLatch;

.field private final zzwo:I


# direct methods
.method public constructor <init>(Landroid/content/Context;Lcom/google/android/gms/internal/ads/zzayt;)V
    .locals 2

    .line 1
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    .line 2
    new-instance v0, Ljava/util/Vector;

    invoke-direct {v0}, Ljava/util/Vector;-><init>()V

    iput-object v0, p0, Lcom/google/android/gms/ads/internal/zzf;->zzbop:Ljava/util/List;

    .line 3
    new-instance v0, Ljava/util/concurrent/atomic/AtomicReference;

    invoke-direct {v0}, Ljava/util/concurrent/atomic/AtomicReference;-><init>()V

    iput-object v0, p0, Lcom/google/android/gms/ads/internal/zzf;->zzboq:Ljava/util/concurrent/atomic/AtomicReference;

    .line 4
    new-instance v0, Ljava/util/concurrent/atomic/AtomicReference;

    invoke-direct {v0}, Ljava/util/concurrent/atomic/AtomicReference;-><init>()V

    iput-object v0, p0, Lcom/google/android/gms/ads/internal/zzf;->zzbor:Ljava/util/concurrent/atomic/AtomicReference;

    .line 5
    new-instance v0, Ljava/util/concurrent/CountDownLatch;

    const/4 v1, 0x1

    invoke-direct {v0, v1}, Ljava/util/concurrent/CountDownLatch;-><init>(I)V

    iput-object v0, p0, Lcom/google/android/gms/ads/internal/zzf;->zzbot:Ljava/util/concurrent/CountDownLatch;

    .line 6
    iput-object p1, p0, Lcom/google/android/gms/ads/internal/zzf;->context:Landroid/content/Context;

    .line 7
    iput-object p2, p0, Lcom/google/android/gms/ads/internal/zzf;->zzbos:Lcom/google/android/gms/internal/ads/zzayt;

    .line 8
    sget-object p1, Lcom/google/android/gms/internal/ads/zzabh;->zzcra:Lcom/google/android/gms/internal/ads/zzaaw;

    .line 9
    invoke-static {}, Lcom/google/android/gms/internal/ads/zzwo;->zzqq()Lcom/google/android/gms/internal/ads/zzabd;

    move-result-object p2

    invoke-virtual {p2, p1}, Lcom/google/android/gms/internal/ads/zzabd;->zzd(Lcom/google/android/gms/internal/ads/zzaaw;)Ljava/lang/Object;

    move-result-object p1

    .line 10
    check-cast p1, Ljava/lang/Integer;

    invoke-virtual {p1}, Ljava/lang/Integer;->intValue()I

    move-result p1

    if-eq p1, v1, :cond_1

    const/4 p2, 0x2

    if-eq p1, p2, :cond_0

    .line 16
    sget p1, Lcom/google/android/gms/internal/ads/zzcw;->zzng:I

    iput p1, p0, Lcom/google/android/gms/ads/internal/zzf;->zzwo:I

    goto :goto_0

    .line 12
    :cond_0
    sget p1, Lcom/google/android/gms/internal/ads/zzcw;->zzni:I

    iput p1, p0, Lcom/google/android/gms/ads/internal/zzf;->zzwo:I

    goto :goto_0

    .line 14
    :cond_1
    sget p1, Lcom/google/android/gms/internal/ads/zzcw;->zznh:I

    iput p1, p0, Lcom/google/android/gms/ads/internal/zzf;->zzwo:I

    .line 18
    :goto_0
    sget-object p1, Lcom/google/android/gms/internal/ads/zzabh;->zzcrp:Lcom/google/android/gms/internal/ads/zzaaw;

    .line 19
    invoke-static {}, Lcom/google/android/gms/internal/ads/zzwo;->zzqq()Lcom/google/android/gms/internal/ads/zzabd;

    move-result-object p2

    invoke-virtual {p2, p1}, Lcom/google/android/gms/internal/ads/zzabd;->zzd(Lcom/google/android/gms/internal/ads/zzaaw;)Ljava/lang/Object;

    move-result-object p1

    .line 20
    check-cast p1, Ljava/lang/Boolean;

    invoke-virtual {p1}, Ljava/lang/Boolean;->booleanValue()Z

    move-result p1

    if-eqz p1, :cond_2

    .line 21
    sget-object p1, Lcom/google/android/gms/internal/ads/zzayv;->zzegi:Lcom/google/android/gms/internal/ads/zzdzk;

    invoke-interface {p1, p0}, Lcom/google/android/gms/internal/ads/zzdzk;->execute(Ljava/lang/Runnable;)V

    return-void

    .line 22
    :cond_2
    invoke-static {}, Lcom/google/android/gms/internal/ads/zzwo;->zzqm()Lcom/google/android/gms/internal/ads/zzayd;

    invoke-static {}, Lcom/google/android/gms/internal/ads/zzayd;->zzzv()Z

    move-result p1

    if-eqz p1, :cond_3

    .line 23
    sget-object p1, Lcom/google/android/gms/internal/ads/zzayv;->zzegi:Lcom/google/android/gms/internal/ads/zzdzk;

    invoke-interface {p1, p0}, Lcom/google/android/gms/internal/ads/zzdzk;->execute(Ljava/lang/Runnable;)V

    return-void

    .line 24
    :cond_3
    invoke-virtual {p0}, Lcom/google/android/gms/ads/internal/zzf;->run()V

    return-void
.end method

.method private final zzca()Lcom/google/android/gms/internal/ads/zzdv;
    .locals 2

    .line 114
    iget v0, p0, Lcom/google/android/gms/ads/internal/zzf;->zzwo:I

    sget v1, Lcom/google/android/gms/internal/ads/zzcw;->zznh:I

    if-ne v0, v1, :cond_0

    .line 115
    iget-object v0, p0, Lcom/google/android/gms/ads/internal/zzf;->zzbor:Ljava/util/concurrent/atomic/AtomicReference;

    invoke-virtual {v0}, Ljava/util/concurrent/atomic/AtomicReference;->get()Ljava/lang/Object;

    move-result-object v0

    check-cast v0, Lcom/google/android/gms/internal/ads/zzdv;

    return-object v0

    .line 116
    :cond_0
    iget-object v0, p0, Lcom/google/android/gms/ads/internal/zzf;->zzboq:Ljava/util/concurrent/atomic/AtomicReference;

    invoke-virtual {v0}, Ljava/util/concurrent/atomic/AtomicReference;->get()Ljava/lang/Object;

    move-result-object v0

    check-cast v0, Lcom/google/android/gms/internal/ads/zzdv;

    return-object v0
.end method

.method private static zze(Landroid/content/Context;)Landroid/content/Context;
    .locals 1

    .line 42
    invoke-virtual {p0}, Landroid/content/Context;->getApplicationContext()Landroid/content/Context;

    move-result-object v0

    if-nez v0, :cond_0

    return-object p0

    :cond_0
    return-object v0
.end method

.method private final zzjz()Z
    .locals 2

    .line 26
    :try_start_0
    iget-object v0, p0, Lcom/google/android/gms/ads/internal/zzf;->zzbot:Ljava/util/concurrent/CountDownLatch;

    invoke-virtual {v0}, Ljava/util/concurrent/CountDownLatch;->await()V
    :try_end_0
    .catch Ljava/lang/InterruptedException; {:try_start_0 .. :try_end_0} :catch_0

    const/4 v0, 0x1

    return v0

    :catch_0
    move-exception v0

    const-string v1, "Interrupted during GADSignals creation."

    .line 29
    invoke-static {v1, v0}, Lcom/google/android/gms/ads/internal/util/zzd;->zzd(Ljava/lang/String;Ljava/lang/Throwable;)V

    const/4 v0, 0x0

    return v0
.end method

.method private final zzka()V
    .locals 7

    .line 31
    invoke-direct {p0}, Lcom/google/android/gms/ads/internal/zzf;->zzca()Lcom/google/android/gms/internal/ads/zzdv;

    move-result-object v0

    .line 32
    iget-object v1, p0, Lcom/google/android/gms/ads/internal/zzf;->zzbop:Ljava/util/List;

    invoke-interface {v1}, Ljava/util/List;->isEmpty()Z

    move-result v1

    if-nez v1, :cond_4

    if-nez v0, :cond_0

    goto :goto_1

    .line 34
    :cond_0
    iget-object v1, p0, Lcom/google/android/gms/ads/internal/zzf;->zzbop:Ljava/util/List;

    invoke-interface {v1}, Ljava/util/List;->iterator()Ljava/util/Iterator;

    move-result-object v1

    :cond_1
    :goto_0
    invoke-interface {v1}, Ljava/util/Iterator;->hasNext()Z

    move-result v2

    if-eqz v2, :cond_3

    invoke-interface {v1}, Ljava/util/Iterator;->next()Ljava/lang/Object;

    move-result-object v2

    check-cast v2, [Ljava/lang/Object;

    .line 35
    array-length v3, v2

    const/4 v4, 0x0

    const/4 v5, 0x1

    if-ne v3, v5, :cond_2

    .line 36
    aget-object v2, v2, v4

    check-cast v2, Landroid/view/MotionEvent;

    invoke-interface {v0, v2}, Lcom/google/android/gms/internal/ads/zzdv;->zza(Landroid/view/MotionEvent;)V

    goto :goto_0

    .line 37
    :cond_2
    array-length v3, v2

    const/4 v6, 0x3

    if-ne v3, v6, :cond_1

    .line 38
    aget-object v3, v2, v4

    check-cast v3, Ljava/lang/Integer;

    invoke-virtual {v3}, Ljava/lang/Integer;->intValue()I

    move-result v3

    aget-object v4, v2, v5

    check-cast v4, Ljava/lang/Integer;

    invoke-virtual {v4}, Ljava/lang/Integer;->intValue()I

    move-result v4

    const/4 v5, 0x2

    aget-object v2, v2, v5

    check-cast v2, Ljava/lang/Integer;

    invoke-virtual {v2}, Ljava/lang/Integer;->intValue()I

    move-result v2

    invoke-interface {v0, v3, v4, v2}, Lcom/google/android/gms/internal/ads/zzdv;->zza(III)V

    goto :goto_0

    .line 40
    :cond_3
    iget-object v0, p0, Lcom/google/android/gms/ads/internal/zzf;->zzbop:Ljava/util/List;

    invoke-interface {v0}, Ljava/util/List;->clear()V

    :cond_4
    :goto_1
    return-void
.end method


# virtual methods
.method public final run()V
    .locals 5

    const/4 v0, 0x0

    const/4 v1, 0x0

    .line 87
    :try_start_0
    iget-object v2, p0, Lcom/google/android/gms/ads/internal/zzf;->zzbos:Lcom/google/android/gms/internal/ads/zzayt;

    iget-boolean v2, v2, Lcom/google/android/gms/internal/ads/zzayt;->zzegg:Z

    .line 89
    sget-object v3, Lcom/google/android/gms/internal/ads/zzabh;->zzcox:Lcom/google/android/gms/internal/ads/zzaaw;

    .line 90
    invoke-static {}, Lcom/google/android/gms/internal/ads/zzwo;->zzqq()Lcom/google/android/gms/internal/ads/zzabd;

    move-result-object v4

    invoke-virtual {v4, v3}, Lcom/google/android/gms/internal/ads/zzabd;->zzd(Lcom/google/android/gms/internal/ads/zzaaw;)Ljava/lang/Object;

    move-result-object v3

    .line 91
    check-cast v3, Ljava/lang/Boolean;

    invoke-virtual {v3}, Ljava/lang/Boolean;->booleanValue()Z

    move-result v3

    if-nez v3, :cond_0

    if-eqz v2, :cond_0

    const/4 v0, 0x1

    .line 93
    :cond_0
    iget v2, p0, Lcom/google/android/gms/ads/internal/zzf;->zzwo:I

    sget v3, Lcom/google/android/gms/internal/ads/zzcw;->zznh:I

    if-eq v2, v3, :cond_1

    .line 94
    iget-object v2, p0, Lcom/google/android/gms/ads/internal/zzf;->zzbos:Lcom/google/android/gms/internal/ads/zzayt;

    iget-object v2, v2, Lcom/google/android/gms/internal/ads/zzayt;->zzbrf:Ljava/lang/String;

    iget-object v3, p0, Lcom/google/android/gms/ads/internal/zzf;->context:Landroid/content/Context;

    .line 95
    invoke-static {v3}, Lcom/google/android/gms/ads/internal/zzf;->zze(Landroid/content/Context;)Landroid/content/Context;

    move-result-object v3

    iget v4, p0, Lcom/google/android/gms/ads/internal/zzf;->zzwo:I

    .line 97
    invoke-static {v2, v3, v0, v4}, Lcom/google/android/gms/internal/ads/zzeg;->zzb(Ljava/lang/String;Landroid/content/Context;ZI)Lcom/google/android/gms/internal/ads/zzeg;

    move-result-object v2

    .line 99
    iget-object v3, p0, Lcom/google/android/gms/ads/internal/zzf;->zzboq:Ljava/util/concurrent/atomic/AtomicReference;

    invoke-virtual {v3, v2}, Ljava/util/concurrent/atomic/AtomicReference;->set(Ljava/lang/Object;)V

    .line 100
    :cond_1
    iget v2, p0, Lcom/google/android/gms/ads/internal/zzf;->zzwo:I

    sget v3, Lcom/google/android/gms/internal/ads/zzcw;->zzng:I

    if-eq v2, v3, :cond_2

    .line 101
    iget-object v2, p0, Lcom/google/android/gms/ads/internal/zzf;->zzbos:Lcom/google/android/gms/internal/ads/zzayt;

    iget-object v2, v2, Lcom/google/android/gms/internal/ads/zzayt;->zzbrf:Ljava/lang/String;

    iget-object v3, p0, Lcom/google/android/gms/ads/internal/zzf;->context:Landroid/content/Context;

    .line 102
    invoke-static {v3}, Lcom/google/android/gms/ads/internal/zzf;->zze(Landroid/content/Context;)Landroid/content/Context;

    move-result-object v3

    .line 103
    invoke-static {v2, v3, v0}, Lcom/google/android/gms/internal/ads/zzdp;->zza(Ljava/lang/String;Landroid/content/Context;Z)Lcom/google/android/gms/internal/ads/zzdp;

    move-result-object v0

    .line 105
    iget-object v2, p0, Lcom/google/android/gms/ads/internal/zzf;->zzbor:Ljava/util/concurrent/atomic/AtomicReference;

    invoke-virtual {v2, v0}, Ljava/util/concurrent/atomic/AtomicReference;->set(Ljava/lang/Object;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    .line 106
    :cond_2
    iget-object v0, p0, Lcom/google/android/gms/ads/internal/zzf;->zzbot:Ljava/util/concurrent/CountDownLatch;

    invoke-virtual {v0}, Ljava/util/concurrent/CountDownLatch;->countDown()V

    .line 107
    iput-object v1, p0, Lcom/google/android/gms/ads/internal/zzf;->context:Landroid/content/Context;

    .line 108
    iput-object v1, p0, Lcom/google/android/gms/ads/internal/zzf;->zzbos:Lcom/google/android/gms/internal/ads/zzayt;

    return-void

    :catchall_0
    move-exception v0

    .line 110
    iget-object v2, p0, Lcom/google/android/gms/ads/internal/zzf;->zzbot:Ljava/util/concurrent/CountDownLatch;

    invoke-virtual {v2}, Ljava/util/concurrent/CountDownLatch;->countDown()V

    .line 111
    iput-object v1, p0, Lcom/google/android/gms/ads/internal/zzf;->context:Landroid/content/Context;

    .line 112
    iput-object v1, p0, Lcom/google/android/gms/ads/internal/zzf;->zzbos:Lcom/google/android/gms/internal/ads/zzayt;

    .line 113
    throw v0
.end method

.method public final zza(Landroid/content/Context;Landroid/view/View;Landroid/app/Activity;)Ljava/lang/String;
    .locals 1

    .line 56
    invoke-direct {p0}, Lcom/google/android/gms/ads/internal/zzf;->zzca()Lcom/google/android/gms/internal/ads/zzdv;

    move-result-object v0

    if-eqz v0, :cond_0

    .line 58
    invoke-interface {v0, p1, p2, p3}, Lcom/google/android/gms/internal/ads/zzdv;->zza(Landroid/content/Context;Landroid/view/View;Landroid/app/Activity;)Ljava/lang/String;

    move-result-object p1

    return-object p1

    :cond_0
    const-string p1, ""

    return-object p1
.end method

.method public final zza(Landroid/content/Context;Ljava/lang/String;Landroid/view/View;)Ljava/lang/String;
    .locals 1

    const/4 v0, 0x0

    .line 60
    invoke-virtual {p0, p1, p2, p3, v0}, Lcom/google/android/gms/ads/internal/zzf;->zza(Landroid/content/Context;Ljava/lang/String;Landroid/view/View;Landroid/app/Activity;)Ljava/lang/String;

    move-result-object p1

    return-object p1
.end method

.method public final zza(Landroid/content/Context;Ljava/lang/String;Landroid/view/View;Landroid/app/Activity;)Ljava/lang/String;
    .locals 1

    .line 61
    invoke-direct {p0}, Lcom/google/android/gms/ads/internal/zzf;->zzjz()Z

    move-result v0

    if-eqz v0, :cond_0

    .line 62
    invoke-direct {p0}, Lcom/google/android/gms/ads/internal/zzf;->zzca()Lcom/google/android/gms/internal/ads/zzdv;

    move-result-object v0

    if-eqz v0, :cond_0

    .line 64
    invoke-direct {p0}, Lcom/google/android/gms/ads/internal/zzf;->zzka()V

    .line 66
    invoke-static {p1}, Lcom/google/android/gms/ads/internal/zzf;->zze(Landroid/content/Context;)Landroid/content/Context;

    move-result-object p1

    .line 67
    invoke-interface {v0, p1, p2, p3, p4}, Lcom/google/android/gms/internal/ads/zzdv;->zza(Landroid/content/Context;Ljava/lang/String;Landroid/view/View;Landroid/app/Activity;)Ljava/lang/String;

    move-result-object p1

    return-object p1

    :cond_0
    const-string p1, ""

    return-object p1
.end method

.method public final zza(III)V
    .locals 3

    .line 79
    invoke-direct {p0}, Lcom/google/android/gms/ads/internal/zzf;->zzca()Lcom/google/android/gms/internal/ads/zzdv;

    move-result-object v0

    if-eqz v0, :cond_0

    .line 81
    invoke-direct {p0}, Lcom/google/android/gms/ads/internal/zzf;->zzka()V

    .line 82
    invoke-interface {v0, p1, p2, p3}, Lcom/google/android/gms/internal/ads/zzdv;->zza(III)V

    return-void

    .line 83
    :cond_0
    iget-object v0, p0, Lcom/google/android/gms/ads/internal/zzf;->zzbop:Ljava/util/List;

    const/4 v1, 0x3

    new-array v1, v1, [Ljava/lang/Object;

    const/4 v2, 0x0

    invoke-static {p1}, Ljava/lang/Integer;->valueOf(I)Ljava/lang/Integer;

    move-result-object p1

    aput-object p1, v1, v2

    const/4 p1, 0x1

    invoke-static {p2}, Ljava/lang/Integer;->valueOf(I)Ljava/lang/Integer;

    move-result-object p2

    aput-object p2, v1, p1

    const/4 p1, 0x2

    invoke-static {p3}, Ljava/lang/Integer;->valueOf(I)Ljava/lang/Integer;

    move-result-object p2

    aput-object p2, v1, p1

    invoke-interface {v0, v1}, Ljava/util/List;->add(Ljava/lang/Object;)Z

    return-void
.end method

.method public final zza(Landroid/view/MotionEvent;)V
    .locals 3

    .line 73
    invoke-direct {p0}, Lcom/google/android/gms/ads/internal/zzf;->zzca()Lcom/google/android/gms/internal/ads/zzdv;

    move-result-object v0

    if-eqz v0, :cond_0

    .line 75
    invoke-direct {p0}, Lcom/google/android/gms/ads/internal/zzf;->zzka()V

    .line 76
    invoke-interface {v0, p1}, Lcom/google/android/gms/internal/ads/zzdv;->zza(Landroid/view/MotionEvent;)V

    return-void

    .line 77
    :cond_0
    iget-object v0, p0, Lcom/google/android/gms/ads/internal/zzf;->zzbop:Ljava/util/List;

    const/4 v1, 0x1

    new-array v1, v1, [Ljava/lang/Object;

    const/4 v2, 0x0

    aput-object p1, v1, v2

    invoke-interface {v0, v1}, Ljava/util/List;->add(Ljava/lang/Object;)Z

    return-void
.end method

.method public final zzb(Landroid/content/Context;)Ljava/lang/String;
    .locals 2

    .line 45
    invoke-direct {p0}, Lcom/google/android/gms/ads/internal/zzf;->zzjz()Z

    move-result v0

    if-eqz v0, :cond_2

    .line 47
    iget v0, p0, Lcom/google/android/gms/ads/internal/zzf;->zzwo:I

    sget v1, Lcom/google/android/gms/internal/ads/zzcw;->zznh:I

    if-eq v0, v1, :cond_1

    iget v0, p0, Lcom/google/android/gms/ads/internal/zzf;->zzwo:I

    sget v1, Lcom/google/android/gms/internal/ads/zzcw;->zzni:I

    if-ne v0, v1, :cond_0

    goto :goto_0

    .line 49
    :cond_0
    iget-object v0, p0, Lcom/google/android/gms/ads/internal/zzf;->zzboq:Ljava/util/concurrent/atomic/AtomicReference;

    invoke-virtual {v0}, Ljava/util/concurrent/atomic/AtomicReference;->get()Ljava/lang/Object;

    move-result-object v0

    check-cast v0, Lcom/google/android/gms/internal/ads/zzdv;

    goto :goto_1

    .line 48
    :cond_1
    :goto_0
    iget-object v0, p0, Lcom/google/android/gms/ads/internal/zzf;->zzbor:Ljava/util/concurrent/atomic/AtomicReference;

    invoke-virtual {v0}, Ljava/util/concurrent/atomic/AtomicReference;->get()Ljava/lang/Object;

    move-result-object v0

    check-cast v0, Lcom/google/android/gms/internal/ads/zzdv;

    :goto_1
    if-eqz v0, :cond_2

    .line 52
    invoke-direct {p0}, Lcom/google/android/gms/ads/internal/zzf;->zzka()V

    .line 53
    invoke-static {p1}, Lcom/google/android/gms/ads/internal/zzf;->zze(Landroid/content/Context;)Landroid/content/Context;

    move-result-object p1

    invoke-interface {v0, p1}, Lcom/google/android/gms/internal/ads/zzdv;->zzb(Landroid/content/Context;)Ljava/lang/String;

    move-result-object p1

    return-object p1

    :cond_2
    const-string p1, ""

    return-object p1
.end method

.method public final zzb(Landroid/view/View;)V
    .locals 1

    .line 69
    invoke-direct {p0}, Lcom/google/android/gms/ads/internal/zzf;->zzca()Lcom/google/android/gms/internal/ads/zzdv;

    move-result-object v0

    if-eqz v0, :cond_0

    .line 71
    invoke-interface {v0, p1}, Lcom/google/android/gms/internal/ads/zzdv;->zzb(Landroid/view/View;)V

    :cond_0
    return-void
.end method

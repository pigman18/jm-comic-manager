#include <windows.h>
#include <shobjidl.h>
#include <ole2.h>
#include <node_api.h>

// 获取当前进程窗口句柄
HWND GetHwnd() {
    return GetConsoleWindow();
}

// 设置进度
napi_value SetProgress(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value args[1];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    double value = -1;
    napi_get_value_double(env, args[0], &value);

    HWND hwnd = GetHwnd();
    if (!hwnd) return nullptr;

    HRESULT hr = CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED);
    if (FAILED(hr)) return nullptr;

    ITaskbarList3* taskbar = nullptr;
    hr = CoCreateInstance(
        CLSID_TaskbarList,
        nullptr,
        CLSCTX_INPROC_SERVER,
        IID_ITaskbarList3,
        (void**)&taskbar
    );

    if (SUCCEEDED(hr)) {
        taskbar->HrInit();

        if (value < 0) {
            taskbar->SetProgressState(hwnd, TBPF_NOPROGRESS);
        } else if (value >= 1.0) {
            taskbar->SetProgressState(hwnd, TBPF_NORMAL);
            taskbar->SetProgressValue(hwnd, 100, 100);
        } else {
            taskbar->SetProgressState(hwnd, TBPF_NORMAL);
            taskbar->SetProgressValue(
                hwnd,
                static_cast<ULONGLONG>(value * 100),
                100
            );
        }

        taskbar->Release();
    }

    CoUninitialize();
    return nullptr;
}

// 不确定进度（滚动动画）
napi_value SetIndeterminate(napi_env env, napi_callback_info info) {
    HWND hwnd = GetHwnd();
    if (!hwnd) return nullptr;

    CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED);

    ITaskbarList3* taskbar = nullptr;
    if (SUCCEEDED(CoCreateInstance(
        CLSID_TaskbarList, nullptr, CLSCTX_INPROC_SERVER,
        IID_ITaskbarList3, (void**)&taskbar
    ))) {
        taskbar->HrInit();
        taskbar->SetProgressState(hwnd, TBPF_INDETERMINATE);
        taskbar->Release();
    }

    CoUninitialize();
    return nullptr;
}

// 错误态
napi_value SetError(napi_env env, napi_callback_info info) {
    HWND hwnd = GetHwnd();
    if (!hwnd) return nullptr;

    CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED);

    ITaskbarList3* taskbar = nullptr;
    if (SUCCEEDED(CoCreateInstance(
        CLSID_TaskbarList, nullptr, CLSCTX_INPROC_SERVER,
        IID_ITaskbarList3, (void**)&taskbar
    ))) {
        taskbar->HrInit();
        taskbar->SetProgressState(hwnd, TBPF_ERROR);
        taskbar->Release();
    }

    CoUninitialize();
    return nullptr;
}

// 模块导出
napi_value Init(napi_env env, napi_value exports) {
    napi_value fn_progress, fn_indeterminate, fn_error;

    napi_create_function(env, nullptr, 0, SetProgress, nullptr, &fn_progress);
    napi_create_function(env, nullptr, 0, SetIndeterminate, nullptr, &fn_indeterminate);
    napi_create_function(env, nullptr, 0, SetError, nullptr, &fn_error);

    napi_set_named_property(env, exports, "setProgress", fn_progress);
    napi_set_named_property(env, exports, "setIndeterminate", fn_indeterminate);
    napi_set_named_property(env, exports, "setError", fn_error);

    return exports;
}

NAPI_MODULE(taskbar_progress, Init)
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useRef, useMemo, useEffect } from 'react'
import ComDOMWrapper, {
    BatchResponse,
    ComDOMStatus,
    IComDOMWrapper,
} from '../web-worker/comdom-wrapper'

export type ComDOMError = {
    id: number
    message: string
    cause: string
}

/**
 * @description The status of the useComDOM hook, derived from the status of the query and the web worker.
 * @enum string STOPPED - The ComDOM web worker does not exist
 * @enum string PAUSED - The query has been paused, but the ComDOM web worker is still exists
 * @enum string RUNNING - The query is running
 * @enum string DONE - The query is done, ComDOM web worker has also finished fetching all data.
 */
export enum UseComDOMStatus {
    STOPPED = 'stopped',
    PAUSED = 'paused',
    RUNNING = 'running',
    DONE = 'done',
    ERROR = 'error',
}

/**
 * @description A React hook that fetches data from a ComDOM web worker and updates the corresponding query in the React Query cache.
 * @param url The URL that the ComDOM web worker will fetch data from. This URL must be the same origin as the page that is using this hook. The URL must stream NDJSON events.
 * @param initialData An array of TData type that will be used as the initial data for the query.
 * @param fetchOnCreate If true, the ComDOM web worker will start fetching data immediately after it is created. If false, the ComDOM web worker will not start fetching data until the start() function is called.
 * @param restInterval The time in ms that the query will sleep before checking if new data is available from the ComDOM web worker. Set to Infinity to disable automatic background checking for new data.
 * @param fetchInterval The time in ms that the query will wait before fetching the next batch of data. This is used to prevent the query from fetching data too frequently.
 * @param debug Enable debug logging for the hook, ComDOM wrapper and ComDOM web worker.
 * 
 * @returns query The query object from (tanstack/react-query) returned by the useQuery hook.
 * @returns dataSink A ref that contains the current data sink. This is same as query.data but is a ref instead of a state variable.
 * @returns status {@link UseComDOMStatus}The status of the useComDOM hook, derived from the status of the query and the web worker.
 * @returns comDOMStatus {@link ComDOMStatus} The status of the ComDOM web worker.
 * @returns pollInterval The current poll interval of the query in milliseconds.
 * @returns errors {@link ComDOMError[]} An array of errors that have occurred.
 * @returns start(url: string = {@link @param url}) A function that starts the ComDOM web worker.
 * @returns pause A function that pauses the query.
 * @returns resume A function that resumes the query.
 * @returns stop A function that stops the ComDOM web worker. This will also stop the query.
 * @returns resolveError A function that removes an error from the errors array, given the error id. The errors are of type {@link ComDOMError}.
 * @returns resolveAllErrors A function that removes all errors from the errors array.
 */

export default function useComDOM<TData>(
    url: string,
    initialData: TData[] = [],
    fetchOnCreate: boolean = false,
    restInterval: number = Infinity,
    fetchInterval: number = 200,
    debug: boolean = false,
) {
    const requestURL = useMemo(() => new URL(url), [url])
    const dataSink = useRef<TData[]>(initialData)
    const comDOMWrapper: IComDOMWrapper<TData> = useMemo(() => {
        return new ComDOMWrapper<TData>(requestURL, fetchOnCreate, debug)
    }, [requestURL, fetchOnCreate, debug])
    const [comDOMStatus, setComDOMStatus] = useState<ComDOMStatus>(
        ComDOMStatus.UNKNOWN,
    )

    const [errors, setErrors] = useState<ComDOMError[]>([])
    const errorId = useRef(0)
    const [pollInterval, setPollInterval] = useState(
        fetchOnCreate ? fetchInterval : Infinity,
    )
    const [status, setStatus] = useState<UseComDOMStatus>(
        UseComDOMStatus.STOPPED,
    )
    const queryClient = useQueryClient()
    const queryKey = [requestURL.hostname, requestURL.pathname]

    useEffect(() => {
        if (fetchOnCreate) {
            start()
        }
    }, [fetchOnCreate])

    const _log = (...args: any[]) => {
        if (debug) {
            console.log(
                'useComDOM Hook: ',
                new Date().toTimeString(),
                ':',
                ...args,
            )
        }
    }

    const resolveError = (id: number) => {
        setErrors(errors => errors.filter(error => error.id !== id))
    }

    const resolveAllErrors = () => {
        setErrors([])
    }

    const reportError = (message: string, cause: string) => {
        _log('Error', message, cause)
        errorId.current += 1
        const error = {
            id: errorId.current ,
            message: message,
            cause: cause,
        }
        setErrors([...errors, error])
    }
    const comDOMStatusQueryFn = async () => {
        try {
            const status = await comDOMWrapper.getComDOMStatus()
            setComDOMStatus(status)
            return status
        } catch (error: any) {
            reportError(error, 'Error fetching ComDOM status')
        }
    }

    const queryFn = async () => {
        if (
            comDOMStatus !== ComDOMStatus.RUNNING &&
            comDOMStatus !== ComDOMStatus.DONE
        ) {
            _log(
                'ComDOM Web Worker is not running. The query will not fetch any data',
                'ComDOM Status:',
                comDOMStatus,
            )
            return Promise.reject(
                'ComDOM Web Worker has not been created or it is not running. The query will not fetch any data',
            )
        }
        try {
            setStatus(UseComDOMStatus.RUNNING)
            const batchResponse: BatchResponse<TData> | null =
                await comDOMWrapper.next()
            if (batchResponse == null || !batchResponse.next) {
                setPollInterval(restInterval)
                setStatus(UseComDOMStatus.DONE)
                return Promise.reject('ComDOM has finished fetching all data')
            }
            dataSink.current.push(...batchResponse.data)
            return dataSink.current
        } catch (error: any) {
            reportError(error, 'Error fetching data from background thread')
            setStatus(UseComDOMStatus.ERROR)
            return Promise.reject(error)
        }
    }

    const query = useQuery({
        queryKey: queryKey,
        queryFn: queryFn,
        initialData: initialData,
        refetchInterval: pollInterval,
        refetchOnWindowFocus: fetchOnCreate,
        refetchOnMount: fetchOnCreate,
    })

    const comDOMStatusQuery = useQuery({
        queryKey: [...queryKey, 'comdom-status'],
        queryFn: comDOMStatusQueryFn,
        refetchInterval: pollInterval,
    })

    const start = async (streamURL: string | null = null) => {
        try {
            _log('Resetting data sink')
            dataSink.current = initialData
            _log('Starting ComDOM with URL', requestURL.toString())
            const status = await comDOMWrapper.start()
            if (!status) {
                throw new Error('Error starting ComDOM')
            }
            setPollInterval(fetchInterval)
            const workerStatus = await comDOMWrapper.getComDOMStatus()
            if (workerStatus === ComDOMStatus.UNKNOWN) {
                throw new Error('Unknown ComDOM Web Worker status')
            }
            setComDOMStatus(workerStatus)
            return true
        } catch (error: any) {
            _log('Error starting ComDOM', error)
            reportError(error.message, error.cause)
            return false
        }
    }

    /**
     * Stops the ComDOM web worker and the query.
     * @returns true if the ComDOM web worker was stopped successfully, false otherwise.
     */
    const stop = async () => {
        _log('Stopping ComDOM')
        const success = comDOMWrapper.destroy()
        if (success) {
            setStatus(UseComDOMStatus.STOPPED)
            setPollInterval(Infinity)
        } else {
            reportError('Error stopping ComDOM', 'Error Destroying ComDOM')
            setStatus(UseComDOMStatus.ERROR)
        }
        queryClient.invalidateQueries([...queryKey, 'comdom-status'])
        return success
    }

    const pause = () => {
        setPollInterval(Infinity)
        if (status !== UseComDOMStatus.RUNNING) {
            _log('Cannot pause a non-running ComDOM')
            return false
        }
        setStatus(UseComDOMStatus.PAUSED)
        return true
    }

    const resume = () => {
        setStatus(UseComDOMStatus.RUNNING)
        setPollInterval(fetchInterval)
        return true
    }

    const clean = () => {
        try {
            queryClient.setQueriesData(queryKey, initialData)
            dataSink.current = initialData
            _log('Data sink cleaned')
        } catch (error: any) {
            _log('Error cleaning ComDOM', error)
            return false
        }
        return true
    }

    return {
        query,
        dataSink,
        status,
        comDOMStatus,
        pollInterval,
        errors,
        start,
        stop,
        pause,
        resume,
        clean,
        resolveError,
        resolveAllErrors,
    }
}
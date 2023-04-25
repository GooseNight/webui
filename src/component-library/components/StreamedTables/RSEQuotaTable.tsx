import { H3 } from "@/component-library/components/Text/Headings/H3"
import { P } from "@/component-library/components/Text/Content/P"

import { twMerge } from "tailwind-merge"

import { useEffect, useState } from "react"

import { RSEAccountUsageLimitDTO } from "@/lib/core/data/rucio-dto"
import useComDOM from "@/lib/infrastructure/hooks/useComDOM"
import { FetchStatus } from "@tanstack/react-query"
import {
    createColumnHelper, flexRender, getCoreRowModel, TableOptions, useReactTable, Row, Column,
    getSortedRowModel, SortingState,
    getFilteredRowModel,
} from "@tanstack/react-table"

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import "@/component-library/outputtailwind.css";
import "reflect-metadata";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { HiSortAscending, HiSortDescending, HiDotsHorizontal, HiSearch, HiCheck } from "react-icons/hi"
import { Filter } from "./Filter"

export const RSEQuotaTable = (
    props: {
        data: any,
        fetchstatus: FetchStatus,
        onChange: (selected: string[]) => void,
        askApproval?: boolean,
        selected?: string[],
    }
) => {
    const columnHelper = createColumnHelper<RSEAccountUsageLimitDTO>()

    const isNoQuotaLeftFunction = (row: Row<RSEAccountUsageLimitDTO>) => {
        let noQuota = (row.original.quota_bytes && row.original.quota_bytes < row.original.used_bytes)
        return props.askApproval ? false : noQuota
    }

    const [selectedRSEIDs, setSelectedRSEIDs] = useState<string[]>(props.selected ?? [])
    useEffect(() => {
        setSelectedRSEIDs(props.selected ?? [])
    }, [props.selected])
    useEffect(() => {
        props.onChange(selectedRSEIDs)
    }, [selectedRSEIDs])

    const [windowSize, setWindowSize] = useState([
        window.innerWidth,
        window.innerHeight,
    ]);

    useEffect(() => {
        const handleWindowResize = () => {
            setWindowSize([window.innerWidth, window.innerHeight]);
        };

        window.addEventListener('resize', handleWindowResize);

        return () => {
            window.removeEventListener('resize', handleWindowResize);
        };
    }, []);

    const [smallScreenNameFiltering, setSmallScreenNameFiltering] = useState(false)
    useEffect(() => {
        if (windowSize[0] > 640) {
            setSmallScreenNameFiltering(false)
        }
    }, [windowSize])

    const columns: any[] = [
        {
            id: 'selection',
            header: () => <span className="w-8" />,
            cell: (props: any) => {
                return <span className="ml-2 w-8">
                    <input
                        type="checkbox"
                        disabled={
                            // if quota_bytes is less than used_bytes, disable checkbox
                            // TODO handle "askpermission" case
                            isNoQuotaLeftFunction(props.row) ? true : false
                        }
                        checked={props.row.getIsSelected()}
                        onChange={(event: any) => {
                            if (event.target.checked) {
                                setSelectedRSEIDs([...selectedRSEIDs, props.row.original.rse_id])
                            }
                            else {
                                setSelectedRSEIDs(selectedRSEIDs.filter((did) => did !== props.row.original.rse_id))
                            }
                            props.row.getToggleSelectedHandler()(event)
                        }}
                    />
                </span>
            },
        },
        columnHelper.accessor('rse_id', {
            id: 'rse_id',
            header: 'ID',
            cell: (info) => { <P mono>{info.getValue()}</P> },
        }),
        columnHelper.accessor('rse', {
            id: 'rse',
            header: () => (
                <span className="w-1/2">
                    <H3>RSE Name</H3>
                </span>
            ),
            cell: (info) =>
                <p
                    onClick={(event) => event.stopPropagation()}
                    className={twMerge(
                        "cursor-text flex w-fit select-all break-all",
                        "font-mono dark:text-gray-200"
                    )}
                >
                    {info.getValue()}
                </p>,
        }),
        columnHelper.accessor('used_bytes', {
            id: 'used_bytes',
            header: () => <H3>Used</H3>,
            cell: (props) => {
                // if value is greater than quota bytes, print in red
                if (isNoQuotaLeftFunction(props.row)) {
                    return <P mono className="text-red-500 dark:text-red-500 font-bold">{props.row.original.used_bytes}</P>
                }
                return <P mono>{props.row.original.used_bytes}</P>
            },
        }),
        columnHelper.accessor(row => row.quota_bytes - row.used_bytes, {
            id: 'remaining_bytes',
            header: () => <H3>Remaining</H3>,
            cell: (props) => {
                // if value is greater than quota bytes, print in red
                if (isNoQuotaLeftFunction(props.row)) {
                    return <P mono className="text-red-500 dark:text-red-500 font-bold">{props.row.original.quota_bytes - props.row.original.used_bytes}</P>
                }
                return <P mono>{props.row.original.quota_bytes - props.row.original.used_bytes}</P>
            },
        }),
        columnHelper.accessor('quota_bytes', {
            id: 'quota_bytes',
            header: () => <H3>Quota</H3>,
            cell: (props) => {
                return <P mono>{props.row.original.quota_bytes}</P>
            }
        }),
        columnHelper.accessor('used_files', {
            id: 'used_files',
            header: 'Files',
        }),
        columnHelper.accessor('account', {
            id: 'account',
            header: 'Account',
        }),
    ]
    const [columnVisibility, setColumnVisibility] = useState(
        {
            account: false,
            used_files: false,
            rse_id: false,
            rse: true,
            used_bytes: false,
            remaining_bytes: true,
            quota_bytes: true,
        }
    )

    const table = useReactTable<RSEAccountUsageLimitDTO>({
        data: props.data || [],
        columns: columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        debugTable: true,
        enableRowSelection: true,
        state: {
            columnVisibility: columnVisibility,
        }
    } as TableOptions<RSEAccountUsageLimitDTO>)

    return (
        <div >
            <div className={`h-72 overflow-y-auto border dark:border-2 rounded-md ${props.fetchstatus === "fetching" ? "hover:cursor-wait" : ""}`}>
                <table className="table-fixed w-full text-left">
                    <thead className="w-full">
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr
                                key={headerGroup.id}
                                className="w-full flex-row sticky top-0 bg-white dark:bg-gray-700 shadow-md dark:shadow-none h-12"
                            >
                                <th className="w-8 flex-none grow-0"></th>
                                <th className="w-1/2 sm:w-2/3 flex-auto grow">
                                    <div className={twMerge("flex flex-row items-center space-x-2 sm:space-x-8 justify-between")}>
                                        <span className="sm:shrink-0">
                                            <H3>RSE Name</H3>
                                        </span>
                                        <span className="hidden sm:flex w-full">
                                            <Filter column={table.getColumn("rse") as Column<RSEAccountUsageLimitDTO, unknown>} table={table} />
                                        </span>
                                        <span className="flex sm:hidden pr-4 relative">
                                            <button
                                                onClick={(e) => { setSmallScreenNameFiltering(!smallScreenNameFiltering) }}
                                            >
                                                <HiSearch className="text-xl text-gray-500 dark:text-gray-200" />
                                            </button>
                                        </span>
                                    </div>
                                    <div
                                        id="smallScreenNameFiltering"
                                        className={twMerge(
                                            "absolute inset-0",
                                            smallScreenNameFiltering ? "flex" : "hidden",
                                            "bg-white",
                                            "p-2 flex-row justify-between space-x-2 items-center"
                                        )}
                                    >
                                        <Filter column={table.getColumn("rse") as Column<RSEAccountUsageLimitDTO, unknown>} table={table} />
                                        <button
                                            onClick={(e) => { setSmallScreenNameFiltering(!smallScreenNameFiltering) }}
                                        >
                                            <HiCheck className="text-xl text-gray-500 dark:text-gray-200" />
                                        </button>
                                    </div>
                                </th>
                                <th
                                    {...{
                                        className: twMerge(
                                            "w-1/2 sm:w-1/3 h-full",
                                            "hover:cursor-pointer select-none"
                                        ),
                                        onClick: (e) => {
                                            headerGroup.headers.find((h) => h.id === "remaining_bytes")?.column.getToggleSortingHandler()?.(e)
                                        }
                                    }}
                                >
                                    <span className="flex flex-row justify-between items-center pr-4">
                                        <H3>Remaining Quota</H3>
                                        <span className="text-gray-500 dark:text-gray-200 text-xl">
                                            {
                                                {
                                                    asc: <HiSortAscending />, desc: <HiSortDescending />,
                                                }[headerGroup.headers.find((h) => h.id === "remaining_bytes")?.column.getIsSorted() as string] ??
                                                <HiDotsHorizontal />
                                            }
                                        </span>
                                    </span>
                                </th>
                                <th
                                    {...{
                                        className: twMerge(
                                            "hidden sm:table-cell sm:w-1/3 h-full",
                                            "hover:cursor-pointer select-none"
                                        ),
                                        onClick: (e) => {
                                            headerGroup.headers.find((h) => h.id === "quota_bytes")?.column.getToggleSortingHandler()?.(e)
                                        }
                                    }}
                                >
                                    <span className="flex flex-row justify-between items-center pr-4">
                                        <H3>Total Quota</H3>
                                        <span className="text-gray-500 dark:text-gray-200 text-xl">
                                            {
                                                {
                                                    asc: <HiSortAscending />, desc: <HiSortDescending />,
                                                }[headerGroup.headers.find((h) => h.id === "quota_bytes")?.column.getIsSorted() as string] ??
                                                <HiDotsHorizontal />
                                            }
                                        </span>
                                    </span>
                                </th>
                            </tr>
                        ))}
                    </thead>
                    <tbody
                        className="w-full"
                    >
                        {table.getRowModel().rows.map((row) => {
                            const classes = "w-full border-b dark:border-gray-200 hover:cursor-pointer h-8 "  // maybe handle spinnywheel here
                            const classesDisabled = twMerge(`${classes} dark:bg-gray-800 hover:cursor-not-allowed`)
                            const classesNormal = classes + "hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-900 "
                            const classesSelected = classes + "bg-blue-200 hover:bg-blue-300 dark:bg-blue-500 dark:hover:bg-blue-600"
                            const rse_id = row.original.rse_id
                            const isRSESelected = selectedRSEIDs.includes(rse_id)
                            return (
                                <tr
                                    className={isRSESelected ? classesSelected : (isNoQuotaLeftFunction(row) ? classesDisabled : classesNormal)}
                                    key={row.id}
                                    onClick={(event) => {
                                        // if there is no more quota remaining, do nothing on click
                                        if (isNoQuotaLeftFunction(row)) {
                                            console.log(isNoQuotaLeftFunction(row))
                                            return
                                        }
                                        if (isRSESelected) {
                                            setSelectedRSEIDs(selectedRSEIDs.filter(id => id !== rse_id))
                                        } else {
                                            setSelectedRSEIDs([...selectedRSEIDs, rse_id])
                                        }
                                        row.getToggleSelectedHandler()(event)
                                    }}
                                >
                                    {row.getVisibleCells().map(cell => (
                                        <td
                                            key={cell.id}
                                            className={cell.column.id === "quota_bytes" ? "hidden sm:table-cell" : ""}
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
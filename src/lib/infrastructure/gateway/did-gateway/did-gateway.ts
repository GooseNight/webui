import { DIDDTO, DIDMetaDTO, ListDIDDTO } from '@/lib/core/dto/did-dto'
import { DIDAvailability, DIDType } from '@/lib/core/entity/rucio'
import DIDGatewayOutputPort from '@/lib/core/port/secondary/did-gateway-output-port'
import { BaseHttpErrorTypes } from '@/lib/sdk/gateway-endpoints'
import { injectable } from 'inversify'
import GetDIDEndpoint from './endpoints/get-did-endpoint'
import GetDIDMetaEndpoint from './endpoints/get-did-meta-endpoint'
import ListDIDsEndpoint from './endpoints/list-dids-endpoint'


@injectable()
export default class RucioDIDGateway implements DIDGatewayOutputPort {
    async getDID(
        rucioAuthToken: string,
        scope: string,
        name: string,
    ): Promise<DIDDTO> {
        const endpoint = new GetDIDEndpoint(rucioAuthToken, scope, name)
        const dto = await endpoint.fetch()
        return dto
    }

    async getDIDMeta(rucioAuthToken: string, scope: string, name: string): Promise<DIDMetaDTO> {
        try {
            const endpoint = new GetDIDMetaEndpoint(rucioAuthToken, scope, name)
            // Non streaming endpoints return a single DTO
            const dto: DIDMetaDTO = await endpoint.fetch()
            return Promise.resolve(dto)
        } catch(error) {
            const errorDTO: DIDMetaDTO = {
                status: 'error',
                error: BaseHttpErrorTypes.UNKNOWN_ERROR,
                message: error?.toString(),
                name: name,
                scope: scope,
                account: '',
                did_type: DIDType.UNKNOWN,
                created_at: '',
                updated_at: '',
                availability: DIDAvailability.UNKNOWN,
                obsolete: false,
                hidden: false,
                suppressed: false,
                purge_replicas: false,
                monotonic: false,
                // only for collections
                is_open: false,
                // only for files
                adler32: '',
                md5: '',
                guid: '',
                filesize: 0

            }
            return Promise.resolve(errorDTO)
        }
    }

    async listDIDs(
        rucioAuthToken: string,
        scope: string,
        name: string,
        type: DIDType,
    ): Promise<ListDIDDTO> {
        try {
            const endpoint = new ListDIDsEndpoint(rucioAuthToken, scope, name, type)
            await endpoint.fetch()
            const dto: ListDIDDTO = {
                status: 'success',
                stream: endpoint,
            }
            return Promise.resolve(dto)
        } catch (error) {
            const errorDTO: ListDIDDTO = {
                status: 'error',
                error: BaseHttpErrorTypes.UNKNOWN_ERROR,
                message: error?.toString(),
            }
            return Promise.resolve(errorDTO)
        }
            
    }

}
